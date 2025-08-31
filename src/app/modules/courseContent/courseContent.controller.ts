import { CourseContentService } from './courseContent.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { courseContentFilterableFields } from './courseContent.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CourseContentService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course content insert successfully!',
    data: result,
  });
});

const getByCourseIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseContentFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseContentService.getAllFromDB(filters, options, req.params.courseId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course contents by courseId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CourseContentService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course content data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CourseContentService.updateIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course content data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CourseContentService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course content data deleted!',
    data: result,
  });
});

export const CourseContentController = {
  insertIntoDB,
  getByCourseIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
