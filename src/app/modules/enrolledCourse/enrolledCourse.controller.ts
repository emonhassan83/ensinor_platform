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
    message: 'Enroll course enroll successfully!',
    data: result,
  });
});

const bulkInsertIntoDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.enrollBundleCourses(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Bundle course enrolled successfully!',
    data: result,
  });
});

const getMyFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, enrolledCourseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EnrolledCourseService.getAllFromDB(
    filters,
    options,
    req.user!.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My enroll course data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const myEnrolledCoursesGrade = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.myEnrolledCoursesGrade(
    req.user!.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My enroll course grade data fetched!',
    data: result,
  });
});

const getStudentByAuthorCourse = catchAsync(async (req, res) => {
  const filters = pick(req.query, enrolledCourseFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await EnrolledCourseService.getStudentByAuthorCourse(
    filters,
    options,
    req.params.authorId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Enroll course student fetched by enrolled course!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Enroll course data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.updateIntoDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Enroll course data updated!',
    data: result,
  });
});

const watchLecture = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.watchLectureIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Enroll course watch successfully!',
    data: result,
  });
});

const completeCourseIntoDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.completeCourseIntoDB(
    req.params.id,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Enroll course completed successfully!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await EnrolledCourseService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Enroll course data deleted!',
    data: result,
  });
});

export const EnrolledCourseController = {
  insertIntoDB,
  bulkInsertIntoDB,
  getMyFromDB,
  myEnrolledCoursesGrade,
  getStudentByAuthorCourse,
  getByIdFromDB,
  updateIntoDB,
  watchLecture,
  completeCourseIntoDB,
  deleteFromDB,
};
