import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
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

  const onlineUsers = new Set<string>();
  const chatNamespace = io.of('/chat');

  // ====================== AUTH MIDDLEWARE ======================
  chatNamespace.use(async (socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers['authorization']?.split(' ')[1] ||
      (socket.handshake.headers['token'] as string);

    if (!token) return next(new ApiError(401, 'Authentication token required'));

    try {
      const decoded = jwt.verify(token, config.jwt_access_secret as string) as {
        userId: string;
        role: string;
      };
      socket.data.userId = decoded.userId;
      next();
    } catch (error) {
      next(new ApiError(401, 'Invalid or expired token'));
    }
  });

  // ====================== CONNECTION ======================
  chatNamespace.on('connection', async (socket: Socket) => {
    const userId = socket.data.userId;
    if (!userId) return socket.disconnect();

    console.log(`✅ User connected: ${userId}`);

    socket.join(`user_${userId}`);

    // Join all user's chats
    const userChats = await prisma.chat.findMany({
      where: { participants: { some: { userId } } },
      select: { id: true },
    });

    userChats.forEach(chat => socket.join(`chat_${chat.id}`));

    onlineUsers.add(userId);
    chatNamespace.emit('onlineUsers', Array.from(onlineUsers));

    // ====================== MY CHAT LIST ======================
    socket.on('my-chat-list', async (_, callback) => {
      try {
        const chatList = await ChatService.getMyChatList(userId);
        socket.emit('chat-list', chatList);
        callbackFn(callback, { success: true, data: chatList });
      } catch (err: any) {
        callbackFn(callback, { success: false, message: err.message });
      }
    });

    // ====================== SENT MESSAGE (Unified Event) ======================
    socket.on('sent-message', async (payload, callback) => {
      try {
        const { chatId, text, imageUrl = [] } = payload;

        console.log('📨 send-message received:', { chatId, text, userId });

        if (!chatId) {
          return callbackFn(callback, {
            success: false,
            message: 'chatId is required',
          });
        }

        if (!text?.trim() && (!imageUrl || imageUrl.length === 0)) {
          return callbackFn(callback, {
            success: false,
            message: 'Text or imageUrl is required',
          });
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            receiverId: null, // Always null for both private & group (we use chatId)
            text,
            imageUrl,
          },
          include: {
            sender: { select: { id: true, name: true, photoUrl: true } },
          },
        });

        // Emit to everyone in the chat room
        chatNamespace.to(`chat_${chatId}`).emit('new-message', message);

        // Update chat list for all participants
        const participants = await prisma.chatParticipant.findMany({
          where: { chatId },
          select: { userId: true },
        });

        for (const p of participants) {
          const updatedList = await ChatService.getMyChatList(p.userId);
          chatNamespace.to(`user_${p.userId}`).emit('chat-list', updatedList);
        }

        callbackFn(callback, {
          success: true,
          message: 'Message sent successfully',
          data: message,
        });
      } catch (err: any) {
        console.error('Send Message Error:', err);
        callbackFn(callback, { success: false, message: err.message });
      }
    });

    // ====================== EDIT MESSAGE ======================
    socket.on('edit-message', async (payload, callback) => {
      try {
        const { messageId, text, imageUrl } = payload;

        if (!messageId) {
          return callbackFn(callback, { success: false, message: 'messageId is required' });
        }

        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });
        if (!message) {
          return callbackFn(callback, { success: false, message: 'Message not found' });
        }
        if (message.senderId !== userId) {
          return callbackFn(callback, { success: false, message: 'Unauthorized to edit this message!' });
        }

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: {
            text: text || message.text,
            imageUrl: imageUrl || message.imageUrl,
            updatedAt: new Date(),
          },
          include: {
            sender: { select: { id: true, name: true, photoUrl: true } },
          },
        });

        // Notify everyone in the chat
        chatNamespace.to(`chat_${message.chatId}`).emit('message-updated', updatedMessage);

        callbackFn(callback, {
          success: true,
          message: 'Message edited successfully',
          data: updatedMessage,
        });
      } catch (err: any) {
        callbackFn(callback, { success: false, message: err.message });
      }
    });

    // ====================== DELETE MESSAGE ======================
    socket.on('delete-message', async (payload, callback) => {
      try {
        const { messageId } = payload;

        if (!messageId) {
          return callbackFn(callback, { success: false, message: 'messageId is required' });
        }

        const message = await prisma.message.findUnique({
          where: { id: messageId },
        });

        if (!message) {
          return callbackFn(callback, { success: false, message: 'Message not found' });
        }

        if (message.senderId !== userId) {
          return callbackFn(callback, { success: false, message: 'Unauthorized to delete this message!' });
        }

        await prisma.message.delete({
          where: { id: messageId },
        });

        // Notify everyone in the chat
        chatNamespace.to(`chat_${message.chatId}`).emit('message-deleted', {
          messageId,
          chatId: message.chatId,
        });

        callbackFn(callback, {
          success: true,
          message: 'Message deleted successfully',
        });
      } catch (err: any) {
        callbackFn(callback, { success: false, message: err.message });
      }
    });

    // ====================== MESSAGE SEEN (Only chatId) ======================
    socket.on('message-seen', async (payload, callback) => {
      try {
        const { chatId } = payload;

        if (!chatId) {
          return callbackFn(callback, {
            success: false,
            message: 'chatId is required',
          });
        }

        // Mark all unseen messages in this chat as seen (for current user)
        await prisma.message.updateMany({
          where: {
            chatId,
            senderId: { not: userId }, // Don't mark own messages as seen by self
            seen: false,
          },
          data: { seen: true },
        });

        // Notify other participants that messages were seen
        chatNamespace.to(`chat_${chatId}`).emit('message-seen', {
          chatId,
          seenBy: userId,
        });

        callbackFn(callback, {
          success: true,
          message: 'Messages marked as seen',
        });
      } catch (err: any) {
        callbackFn(callback, { success: false, message: err.message });
      }
    });

    // ====================== TYPING ======================
    socket.on('typing', data => {
      socket.to(`chat_${data.chatId}`).emit('typing', {
        userId,
        chatId: data.chatId,
      });
    });

    socket.on('stopTyping', data => {
      socket.to(`chat_${data.chatId}`).emit('stopTyping', {
        userId,
        chatId: data.chatId,
      });
    });

    // ====================== DISCONNECT ======================
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
      chatNamespace.emit('onlineUsers', Array.from(onlineUsers));
      console.log(`❌ User disconnected: ${userId}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

export default initializeSocketIO;
