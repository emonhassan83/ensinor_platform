import { CourseService } from './course.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { courseFilterableFields } from './course.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CourseService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const filterBy = {
    authorId: req.query.authorId as string | undefined,
    instructorId: req.query.instructorId as string | undefined,
  };

  const result = await CourseService.getAllFromDB(filters, options, filterBy);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Courses data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByCompanyFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseService.getAllFromDB(filters, options, {
    companyId: req.params.companyId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Courses data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyCourseFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Courses data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyInstructorCourse = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseService.getAllFromDB(filters, options, {
    instructorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Courses data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CourseService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CourseService.updateIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course data updated!',
    data: result,
  });
});

const changeStatusIntoDB = catchAsync(async (req, res) => {
  const result = await CourseService.changeStatusIntoDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course status data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CourseService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course data deleted!',
    data: result,
  });
});

export const CourseController = {
  insertIntoDB,
  getAllFromDB,
  getByCompanyFromDB,
  getMyCourseFromDB,
  getMyInstructorCourse,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
