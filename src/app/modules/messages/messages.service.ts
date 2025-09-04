import { Message } from '@prisma/client';
import { IMessage } from './messages.interface';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { getIO } from '../../../socket';

const insertIntoDB = async (payload: IMessage) => {
  // 1. Find existing chat or create new one
  let chat = await prisma.chat.findFirst({
    where: {
      participants: {
        some: { userId: payload.senderId },
      },
      AND: {
        participants: {
          some: { userId: payload.receiverId },
        },
      },
    },
    include: { participants: true },
  });

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        type: 'private',
        participants: {
          create: [
            { userId: payload.senderId },
            { userId: payload.receiverId as string },
          ],
        },
      },
      include: { participants: true },
    });
  }

  // 2. Create the message
  if (!payload.receiverId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'receiverId is required');
  }
  const result = await prisma.message.create({
    data: {
      text: payload.text,
      imageUrl: payload.imageUrl || [],
      senderId: payload.senderId,
      receiverId: payload.receiverId as string,
      chatId: chat!.id,
    },
    include: {
      sender: { select: { id: true, name: true, email: true, photoUrl: true } },
      receiver: {
        select: { id: true, name: true, email: true, photoUrl: true },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Message creation failed');
  }

  // 3. Emit socket events
  const io = getIO();

  const senderMessageEvent = 'new-message::' + result.chatId;
  io.emit(senderMessageEvent, result);

  // Update chat list for sender & receiver
  const senderChatEvent = 'chat-list::' + result.senderId;
  const receiverChatEvent = 'chat-list::' + result.receiverId;

  const chatListSender = await prisma.chat.findMany({
    where: {
      participants: { some: { userId: result.senderId } },
    },
    include: { participants: true, messages: true },
  });

  const chatListReceiver = await prisma.chat.findMany({
    where: {
      participants: { some: { userId: result.receiverId  as string} },
    },
    include: { participants: true, messages: true },
  });

  io.emit(senderChatEvent, chatListSender);
  io.emit(receiverChatEvent, chatListReceiver);

  return result;
};

const getMessagesByChatId = async (chatId: string) => {
  const result = await prisma.message.findMany({
    where: { chatId },
    include: {
      sender: { select: { id: true, name: true, email: true, photoUrl: true } },
      receiver: {
        select: { id: true, name: true, email: true, photoUrl: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Message not found');
  }
  return result;
};

const getByIdFromDB = async (id: string): Promise<Message | null> => {
  const result = await prisma.message.findUnique({
    where: { id },
    include: {
      sender: { select: { id: true, name: true, photoUrl: true } },
      receiver: { select: { id: true, name: true, photoUrl: true } },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Message not found');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IMessage>,
): Promise<Message> => {
  const message = await prisma.message.findUnique({
    where: { id },
  });
  if (!message) {
    throw new ApiError(httpStatus.NOT_FOUND, 'message not found!');
  }

  const result = await prisma.message.update({
    where: { id },
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Message update failed');
  }
  return result;
};

const deleteFromDB = async (id: string): Promise<Message> => {
  const message = await prisma.message.findUniqueOrThrow({
    where: { id },
  });
  if (!message) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Message not found!');
  }

  const result = await prisma.message.delete({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Message not found');
  }
  return result;
};

const deleteMessagesByChatId = async (chatId: string) => {
  const result = await prisma.message.deleteMany({ where: { chatId } });
  if (result.count === 0) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No messages found for this chat');
  }
  return result;
};

export const MessageService = {
  insertIntoDB,
  getMessagesByChatId,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
  deleteMessagesByChatId,
};
