import { CourseService } from './course.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { courseFilterableFields } from './course.constant';
import { CourseType, PlatformType } from '@prisma/client';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CourseService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course insert successfully!',
    data: result,
  });
});

const getPopularCourses = catchAsync(async (req, res) => {
  const result = await CourseService.getPopularCoursesFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Got popular courses data fetched!',
    data: result,
  });
});

const getAllPlatformCourses = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const filterBy = {
    platform: PlatformType.admin,
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

const getCombineCourses = catchAsync(async (req, res) => {
    // Normalize boolean & numeric query params here
  const normalizedQuery: any = {};
  
  
  Object.keys(req.query).forEach(key => {
    const value = req.query[key];

    // convert "true"/"false" into boolean
    if (value === 'true') normalizedQuery[key] = true;
    else if (value === 'false') normalizedQuery[key] = false;
    // convert numbers
    else if (!isNaN(Number(value))) normalizedQuery[key] = Number(value);
    // otherwise keep string
    else normalizedQuery[key] = value;
  });
  
  const filters = pick(normalizedQuery, courseFilterableFields);
  const options = pick(normalizedQuery, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseService.getCombineCoursesFromDB(filters, options, {
    userId: req.user?.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Combine all courses data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByAuthorId = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseService.getCombineCoursesFromDB(filters, options, {
    authorId: req.params.authorId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Combine all courses data fetched by authorId!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllFilterDataFromDB = catchAsync(async (req, res) => {
  const result = await CourseService.getAllFilterDataFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Courses filter data fetched!',
    data: result,
  });
});

const getByCompanyFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseService.getAllFromDB(filters, options, {
    companyId: req.params.companyId,
    platform: PlatformType.company,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My company courses data fetched!',
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

const getMyInternalCourse = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
    type: CourseType.internal,
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
  const result = await CourseService.getByIdFromDB(req.params.id, {
    userId: req.user?.userId,
  });
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

const assignACourse = catchAsync(async (req, res) => {
  const result = await CourseService.assignACourseIntoDB(
    req.params.id,
    req.body,
    req.user!.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course status data updated!',
    data: result,
  });
});

const publishACourse = catchAsync(async (req, res) => {
  const result = await CourseService.publishACourseIntoDB(
    req.params.id,
    req.user!.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course published successfully!',
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
  getPopularCourses,
  getAllPlatformCourses,
  getCombineCourses,
  getMyInternalCourse,
  getByAuthorId,
  getAllFilterDataFromDB,
  getByCompanyFromDB,
  getMyCourseFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  publishACourse,
  assignACourse,
  deleteFromDB,
};
