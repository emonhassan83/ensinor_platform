import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import httpStatus from 'http-status';
import getUserDetailsFromToken from './app/utils/vaildateUserFromToken';
import { callbackFn } from './app/utils/CallbackFn';
import ApiError from './app/errors/ApiError';
import prisma from './app/utils/prisma';

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
        payload.senderId = user.id;

        let chat = await prisma.chat.findFirst({
          where: {
            participants: {
              every: { userId: { in: [payload.senderId, payload.receiverId] } },
            },
          },
        });

        if (!chat) {
          chat = await prisma.chat.create({
            data: {
              type: 'private',
              participants: {
                create: [
                  { userId: payload.senderId },
                  { userId: payload.receiverId },
                ],
              },
            },
          });
        }

        const result = await prisma.message.create({
          data: {
            chatId: chat.id,
            senderId: payload.senderId,
            receiverId: payload.receiverId,
            text: payload.text,
            imageUrl: payload.imageUrl,
          },
        });

        const senderMessage = 'new-message::' + chat.id;
        io.emit(senderMessage, result);

        callbackFn(callback, {
          statusCode: httpStatus.OK,
          success: true,
          message: 'Message sent successfully!',
          data: result,
        });
      });

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
