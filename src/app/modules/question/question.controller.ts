import { QuestionService } from './question.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { questionFilterableFields } from './question.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await QuestionService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question insert successfully!',
    data: result,
  });
});

const addOptionsToQuestion = catchAsync(async (req, res) => {
  const result = await QuestionService.addOptionsToQuestion(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question options insert successfully!',
    data: result,
  });
});

const getByQuizIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, questionFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await QuestionService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz Questions data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await QuestionService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question data fetched by id!',
    data: result,
  });
});

const getOptionsByQuestionId = catchAsync(async (req, res) => {
  const result = await QuestionService.getOptionsByQuestionId(req.params.questionId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question options data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await QuestionService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question data updated!',
    data: result,
  });
});

const updateOption = catchAsync(async (req, res) => {
  const result = await QuestionService.updateOption(
    req.params.optionId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question option data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await QuestionService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question data deleted!',
    data: result,
  });
});

const deleteOption = catchAsync(async (req, res) => {
  const result = await QuestionService.deleteOption(req.params.optionId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Question option data deleted!',
    data: result,
  });
});

export const QuestionController = {
  insertIntoDB,
  addOptionsToQuestion,
  getByQuizIdFromDB,
  getByIdFromDB,
  getOptionsByQuestionId,
  updateIntoDB,
  updateOption,
  deleteFromDB,
  deleteOption
};
