import { MessageService } from './messages.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { messageFilterableFields } from './messages.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { ChatService } from '../chat/chat.service';
import { io } from '../../../server';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await MessageService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message sent successfully!',
    data: result,
  });
});

const getMessagesByChatId = catchAsync(async (req, res) => {
  const result = await MessageService.getMessagesByChatId(req.params.chatId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages retrieved successfully',
    data: result,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await MessageService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await MessageService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message data updated!',
    data: result,
  });
});

const seenMessage = catchAsync(async (req, res) => {
  const { chatId } = req.params;

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { participants: true },
  });

  if (!chat) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Chat id is not valid');
  }

  const result = await MessageService.seenMessage(req.user!.userId, chatId);

  // Extract participants (assuming 2-person private chat)
  const user1 = chat.participants[0].userId;
  const user2 = chat.participants[1].userId;

  // Re-fetch chat lists
  const ChatListUser1 = await ChatService.getMyChatList(user1);
  const ChatListUser2 = await ChatService.getMyChatList(user2);

  // Emit updated chat lists
  io.emit('chat-list::' + user1, ChatListUser1);
  io.emit('chat-list::' + user2, ChatListUser2);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Message seen successfully',
    data: result,
  });
});


const deleteFromDB = catchAsync(async (req, res) => {
  const result = await MessageService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Message data deleted!',
    data: result,
  });
});

const deleteMessagesByChatId = catchAsync(async (req, res) => {
  const result = await MessageService.deleteMessagesByChatId(req.params.chatId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Messages deleted successfully',
    data: result,
  });
});

export const MessageController = {
  insertIntoDB,
  getMessagesByChatId,
  getByIdFromDB,
  updateIntoDB,
  seenMessage,
  deleteFromDB,
  deleteMessagesByChatId,
};
