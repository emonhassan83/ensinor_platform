import { MessageService } from './messages.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { messageFilterableFields } from './messages.constant';

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
  deleteFromDB,
  deleteMessagesByChatId,
};
