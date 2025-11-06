import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import ApiError from './app/errors/ApiError';
import prisma from './app/utils/prisma';
import { ChatService } from './app/modules/chat/chat.service';
import config from './app/config';
import { callbackFn } from './app/utils/CallbackFn';

let io: Server;

const initializeSocketIO = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const onlineUser = new Set();
  const chatNamespace = io.of('/chat');
  const notificationNamespace = io.of('/notification');

  // ✅ Middleware for Authentication
  chatNamespace.use(
    async (
      socket: Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>,
      next,
    ) => {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers['authorization']?.split(' ')[1] ||
        (socket.handshake.headers['token'] as string);

      if (!token) return next(new ApiError(401, 'Authentication token required'));

      try {
        const decoded = jwt.verify(
          token,
          config.jwt_access_secret as string,
        ) as { userId: string; role: string };
        socket.data.userId = decoded.userId;
        socket.data.role = decoded.role;
        next();
      } catch (error) {
        next(
          new ApiError(
            401,
            error instanceof Error ? error.message : 'Invalid or expired token',
          ),
        );
      }
    },
  );

  // ✅ Chat Namespace Connection Handler
  chatNamespace.on('connection', async (socket) => {
    try {
      const user = socket.data;
      if (!user?.userId) return;

      console.log(`✅ User connected: ${user.userId}`);

      // Private room
      socket.join(`user_${user.userId}`);

      // ✅ Auto join all group rooms where user is member
      const userGroups = await prisma.chat.findMany({
        where: {
          // type: 'group',
          participants: { some: { userId: user.userId } },
        },
        select: { id: true },
      });

      userGroups.forEach((g) => {
        const roomName = `chat_${g.id}`;
        socket.join(roomName);
        console.log(`🟢 Auto-joined group room: ${roomName}`);
      });

      // Track online users
      onlineUser.add(user.userId.toString());
      io.emit('onlineUser', Array.from(onlineUser));

      // ---------------- my chat list ----------------
      socket.on('my-chat-list', async (data, callback) => {
        try {
          const chatList = await ChatService.getMyChatList(user.userId);
          const eventName = `chat-list::${user.userId}`;
          chatNamespace.to(`user_${user.userId}`).emit(eventName, chatList);
          callbackFn(callback, { success: true, message: chatList });
        } catch (err: any) {
          callbackFn(callback, { success: false, message: err.message });
        }
      });

      // ---------------- send private message ----------------
      socket.on('send-message', async (payload, callback) => {
        try {
          payload.sender = user.userId;

          let chat = await prisma.chat.findFirst({
            where: {
              type: 'private',
              participants: {
                every: { userId: { in: [payload.sender, payload.receiver] } },
              },
            },
          });

          if (!chat) {
            chat = await prisma.chat.create({
              data: {
                type: 'private',
                participants: {
                  create: [
                    { userId: payload.sender },
                    { userId: payload.receiver },
                  ],
                },
              },
            });
          }

          const result = await prisma.message.create({
            data: {
              chatId: chat.id,
              senderId: payload.sender,
              receiverId: payload.receiver,
              text: payload.text,
              imageUrl: payload.imageUrl,
            },
            include: {
              sender: { select: { id: true, name: true, photoUrl: true } },
              receiver: { select: { id: true, name: true, photoUrl: true } },
            },
          });

          // Emit to both sender & receiver
          chatNamespace.to(`user_${payload.sender}`).emit('new-message', result);
          chatNamespace.to(`user_${payload.receiver}`).emit('new-message', result);

          // Update chat list for both
          const senderChatList = await ChatService.getMyChatList(payload.sender);
          const receiverChatList = await ChatService.getMyChatList(payload.receiver);
          chatNamespace
            .to(`user_${payload.sender}`)
            .emit(`chat-list::${payload.sender}`, senderChatList);
          chatNamespace
            .to(`user_${payload.receiver}`)
            .emit(`chat-list::${payload.receiver}`, receiverChatList);

          callbackFn(callback, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Message sent successfully!',
            data: result,
          });
        } catch (err: any) {
          callbackFn(callback, { success: false, message: err.message });
        }
      });

      // ---------------- send group message ----------------
      socket.on('send-group-message', async (payload, callback) => {
        try {
          payload.sender = user.userId;

          const chat = await prisma.chat.findUnique({
            where: { id: payload.chatId },
            include: { participants: { select: { userId: true } } },
          });

          if (!chat || chat.type !== 'group') {
            return callbackFn(callback, {
              success: false,
              message: 'Invalid or non-group chat!',
            });
          }

          const message = await prisma.message.create({
            data: {
              chatId: payload.chatId,
              senderId: payload.sender,
              receiverId: null,
              text: payload.text,
              imageUrl: payload.imageUrl ?? [],
            },
            include: {
              sender: { select: { id: true, name: true, photoUrl: true } },
            },
          });

          // Emit message to all members in group room
          const roomName = `chat_${payload.chatId}`;
          chatNamespace.to(roomName).emit(`new-message::${payload.chatId}`, message);

          // Update chat list for each member
          for (const p of chat.participants) {
            const list = await ChatService.getMyChatList(p.userId);
            chatNamespace
              .to(`user_${p.userId}`)
              .emit(`chat-list::${p.userId}`, list);
          }

          callbackFn(callback, {
            statusCode: httpStatus.OK,
            success: true,
            message: 'Group message sent!',
            data: message,
          });
        } catch (err: any) {
          callbackFn(callback, { success: false, message: err.message });
        }
      });

      // ---------------- typing events ----------------
      socket.on('typing', (data) => {
        const event = `typing::${data.chatId}`;
        socket.to(`chat_${data.chatId}`).emit(event, {
          userId: user.userId,
          message: 'typing...',
        });
      });

      socket.on('stopTyping', (data) => {
        const event = `stopTyping::${data.chatId}`;
        socket.to(`chat_${data.chatId}`).emit(event, {
          userId: user.userId,
          message: 'stopped typing',
        });
      });

      // ---------------- disconnect ----------------
      socket.on('disconnect', () => {
        onlineUser.delete(user.userId.toString());
        io.emit('onlineUser', Array.from(onlineUser));
        console.log(`❌ Disconnected: ${user.userId}`);
      });
    } catch (error) {
      console.error('Socket Connection Error:', error);
    }
  });

  // Notification Namespace (for future)
  notificationNamespace.on('connection', (socket) => {
    console.log('🔔 Notification connected:', socket.data);
  });

  return io;
};

export default initializeSocketIO;
