import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import httpStatus from 'http-status';
import getUserDetailsFromToken from './app/utils/vaildateUserFromToken';
import { callbackFn } from './app/utils/CallbackFn';
import ApiError from './app/errors/ApiError';
import prisma from './app/utils/prisma';
import { ChatService } from './app/modules/chat/chat.service';

let io: Server;
const initializeSocketIO = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  // Online users
  const onlineUser = new Set();

  io.on('connection', async socket => {
    console.log('connected', socket?.id);

    try {
      // ----------------- get user token -----------------
      const token =
        socket.handshake.auth?.token || socket.handshake.headers?.token;

      let user: any;
      try {
        user = await getUserDetailsFromToken(token);
        if (!user) {
          throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
        }
      } catch (error) {
        console.log(error);
        return;
      }

      socket.join(user?.id.toString());
      onlineUser.add(user?.id.toString());

      // send all online users
      io.emit('onlineUser', Array.from(onlineUser));

      // ----------------- message-page -----------------
      socket.on('message-page', async (userId, callback) => {
        if (!userId) {
          return callbackFn(callback, {
            success: false,
            message: 'userId is required',
          });
        }

        try {
          const receiverDetails = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true, photoUrl: true },
          });

          if (!receiverDetails) {
            return callbackFn(callback, {
              success: false,
              message: 'user not found',
            });
          }

          socket.emit('user-details', receiverDetails);

          const getPreMessage = await prisma.message.findMany({
            where: {
              OR: [
                { senderId: user.id, receiverId: userId },
                { senderId: userId, receiverId: user.id },
              ],
            },
            orderBy: { createdAt: 'asc' },
          });

          socket.emit('message', getPreMessage || []);
        } catch (error: any) {
          callbackFn(callback, { success: false, message: error.message });
        }
      });

      // ----------------- my chat list -----------------
      socket.on('my-chat-list', async (data, callback) => {
        try {
          const chatList = await prisma.chat.findMany({
            where: {
              participants: { some: { userId: user.id } },
            },
            include: {
              participants: {
                include: { user: true },
              },
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });

          const myChat = 'chat-list::' + user.id;
          io.emit(myChat, chatList);

          callbackFn(callback, { success: true, message: chatList });
        } catch (error: any) {
          callbackFn(callback, { success: false, message: error.message });
        }
      });

      // ----------------- send-message -----------------
      socket.on('send-message', async (payload, callback) => {
        payload.sender = user.id;

        let chat = await prisma.chat.findFirst({
          where: {
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
        });

        const senderMessage = 'new-message::' + chat.id;
        io.emit(senderMessage, result);

        const ChatListSender = await ChatService.getMyChatList(
          result?.senderId.toString(),
        );
        const senderChat = 'chat-list::' + result.senderId.toString();
        io.emit(senderChat, ChatListSender);

        const ChatListReceiver = await ChatService.getMyChatList(
          result?.receiverId!.toString(),
        );

        const receiverChat = 'chat-list::' + result.receiverId!.toString();

        io.emit(receiverChat, ChatListReceiver);

        callbackFn(callback, {
          statusCode: httpStatus.OK,
          success: true,
          message: 'Message sent successfully!',
          data: result,
        });
      });

      socket.on(
        'send-group-message',
        async (
          payload: {
            text: string;
            sender: string;
            chatId: string; // <-- must be provided
            imageUrl?: string[];
          },
          callback,
        ) => {
          // const userId = (socket.data.user as { id: string }).id;
          payload.sender = user.id;

          try {
            // 1. Validate: chat exists + user is participant
            const chat = await prisma.chat.findUnique({
              where: { id: payload.chatId },
              include: {
                participants: {
                  select: { userId: true },
                },
              },
            });

            if (!chat) {
              return callbackFn(callback, {
                success: false,
                message: 'Chat not found',
              });
            }

            if (chat.type !== 'group') {
              return callbackFn(callback, {
                success: false,
                message: 'This endpoint is for group chats only',
              });
            }

            const isParticipant = chat.participants.some(
              p => p.userId === user.id,
            );
            if (!isParticipant) {
              return callbackFn(callback, {
                success: false,
                message: 'You are not a member of this group',
              });
            }

            // console.log({chat, isParticipant});

            // 2. Create message (receiverId = null for group)
            const message = await prisma.message.create({
              data: {
                chatId: payload.chatId,
                senderId: payload.sender,
                receiverId: null, // <-- GROUP MESSAGE
                text: payload.text,
                imageUrl: payload.imageUrl ?? [],
              },
              include: {
                sender: { select: { id: true, name: true, photoUrl: true } },
              },
            });

            // 3. Emit to ALL participants via room
            const roomName = `chat_${payload.chatId}`;
            io.to(roomName).emit(`new-message::${payload.chatId}`, message);

            // 4. Update chat list for every participant
            const participantIds = chat.participants.map(p => p.userId);

            for (const uid of participantIds) {
              const chatList = await ChatService.getMyChatList(uid);
              io.to(`user_${uid}`).emit(`chat-list::${uid}`, chatList);
            }

            // 5. Success callback
            callbackFn(callback, {
              statusCode: httpStatus.OK,
              success: true,
              message: 'Group message sent!',
              data: message,
            });
          } catch (err: any) {
            console.error('send-group-message error:', err);
            callbackFn(callback, {
              success: false,
              message: err.message || 'Failed to send message',
            });
          }
        },
      );

      // ----------------- typing -----------------
      socket.on('typing', data => {
        const chat = 'typing::' + data.chatId.toString();
        const message = user?.name + ' is typing...';
        socket.emit(chat, { message });
      });

      socket.on('stopTyping', data => {
        const chat = 'stopTyping::' + data.chatId.toString();
        const message = user?.name + ' stopped typing...';
        socket.emit(chat, { message });
      });

      // ----------------- disconnect -----------------
      socket.on('disconnect', () => {
        onlineUser.delete(user?.id.toString());
        io.emit('onlineUser', Array.from(onlineUser));
        console.log('disconnect user ', socket.id);
      });
    } catch (error) {
      console.error('-- socket.io connection error --', error);
    }
  });

  return io;
};

// Getter to use io in service functions
export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export default initializeSocketIO;
