import { QuizAttemptService } from './quizAttempt.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { quizAttemptFilterableFields } from './quizAttempt.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await QuizAttemptService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt insert successfully!',
    data: result,
  });
});

const getByQuizIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, quizAttemptFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await QuizAttemptService.getAllFromDB(filters, options, req.params.quizId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt by quizId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await QuizAttemptService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await QuizAttemptService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await QuizAttemptService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt data deleted!',
    data: result,
  });
});

export const QuizAttemptController = {
  insertIntoDB,
  getByQuizIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
