import { QuizAnswerService } from './quizAnswer.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { quizAnswerFilterableFields } from './quizAnswer.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await QuizAnswerService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz answer insert successfully!',
    data: result,
  });
});

const completeAttemptIntoDB = catchAsync(async (req, res) => {
  const result = await QuizAnswerService.completeAttemptIntoDB(req.params.attemptId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz answer completed successfully!',
    data: result,
  });
});

const getByAttemptIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, quizAnswerFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await QuizAnswerService.getAllFromDB(filters, options, {
    attemptId: req.params.attemptId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz answer by attemptId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await QuizAnswerService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz answer data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await QuizAnswerService.updateIntoDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz answer data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await QuizAnswerService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz answer data deleted!',
    data: result,
  });
});

export const QuizAnswerController = {
  insertIntoDB,
  completeAttemptIntoDB,
  getByAttemptIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
