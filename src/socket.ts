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
  chatNamespace.use(async (socket, next) => {
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
  });

  // ✅ Chat Namespace Connection Handler
  chatNamespace.on('connection', async (socket: Socket) => {
    try {
      const user = socket.data;
      if (!user?.userId) return;

      console.log(`✅ User connected: ${user.userId}`);

      // Private room for user
      socket.join(`user_${user.userId}`);

      // ✅ Auto join all chats (private + group)
      const userChats = await prisma.chat.findMany({
        where: { participants: { some: { userId: user.userId } } },
        select: { id: true },
      });

      userChats.forEach((chat) => socket.join(`chat_${chat.id}`));

      onlineUser.add(user.userId.toString());
      io.emit('onlineUser', Array.from(onlineUser));

      // ---------------- my chat list ----------------
      socket.on('my-chat-list', async (_, callback) => {
        try {
          const chatList = await ChatService.getMyChatList(user.userId);
          chatNamespace.to(`user_${user.userId}`).emit('chat-list', chatList);
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

          // ✅ Emit globally (no chatId-based event)
          chatNamespace.to(`user_${payload.sender}`).emit('new-message', result);
          chatNamespace.to(`user_${payload.receiver}`).emit('new-message', result);

          // ✅ Update chat list for both users
          const senderList = await ChatService.getMyChatList(payload.sender);
          const receiverList = await ChatService.getMyChatList(payload.receiver);
          chatNamespace.to(`user_${payload.sender}`).emit('chat-list', senderList);
          chatNamespace.to(`user_${payload.receiver}`).emit('chat-list', receiverList);

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

          if (!chat) {
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

          // ✅ Emit only 'new-message' (global listener)
          chatNamespace.to(`chat_${payload.chatId}`).emit('new-message', message);

          // ✅ Update chat-list for every participant
          for (const p of chat.participants) {
            const list = await ChatService.getMyChatList(p.userId);
            chatNamespace.to(`user_${p.userId}`).emit('chat-list', list);
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

      // ---------------- typing ----------------
      socket.on('typing', (data) => {
        socket.to(`chat_${data.chatId}`).emit('typing', {
          userId: user.userId,
          message: 'typing...',
        });
      });

      socket.on('stopTyping', (data) => {
        socket.to(`chat_${data.chatId}`).emit('stopTyping', {
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

  notificationNamespace.on('connection', (socket) => {
    console.log('🔔 Notification connected:', socket.data);
  });

  return io;
};

// Getter
export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export default initializeSocketIO;
