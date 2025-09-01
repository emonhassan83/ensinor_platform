import { EnrolledCourseService } from './enrolledCourse.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { enrolledCourseFilterableFields } from './enrolledCourse.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt insert successfully!',
    data: result,
  });
});

const getByQuizIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, enrolledCourseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EnrolledCourseService.getAllFromDB(filters, options, req.params.quizId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt by quizId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.updateIntoDB(
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
  const result = await EnrolledCourseService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Quiz attempt data deleted!',
    data: result,
  });
});

export const EnrolledCourseController = {
  insertIntoDB,
  getByQuizIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
