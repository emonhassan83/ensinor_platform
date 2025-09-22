import { QuizService } from './quiz.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { quizFilterableFields } from './quiz.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await QuizService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz insert successfully!',
    data: result,
  });
});

const getByAuthorIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, quizFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await QuizService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz by author data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByCourseIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, quizFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await QuizService.getAllFromDB(filters, options, {
    courseId: req.params.courseId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz by courseId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await QuizService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await QuizService.updateIntoDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await QuizService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz data deleted!',
    data: result,
  });
});

export const QuizController = {
  insertIntoDB,
  getByAuthorIdFromDB,
  getByCourseIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
