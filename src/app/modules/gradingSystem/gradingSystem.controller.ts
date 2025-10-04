import { GradingSystemService } from './gradingSystem.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { gradingSystemFilterableFields } from './gradingSystem.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await GradingSystemService.insertIntoDB(req.body, req.user);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grading system insert successfully!',
    data: result,
  });
});

const addGrade = catchAsync(async (req, res) => {
  const result = await GradingSystemService.addGrade(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grade insert successfully!',
    data: result,
  });
});

const getDefaultGradingSystem = catchAsync(async (req, res) => {
  const result = await GradingSystemService.getDefaultGradingSystemFromDB();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Default Grading system data fetched!',
    data: result,
  });
});

const getByCourseIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, gradingSystemFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await GradingSystemService.getAllFromDB(filters, options, {
    courseId: req.params.courseId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grading system by course data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getGradesByAuthorId = catchAsync(async (req, res) => {
  const filters = pick(req.query, gradingSystemFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await GradingSystemService.getAllFromDB(
    filters,
    options,
   { authorId: req.user!.userId,}
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grades data fetched by author!',
    data: result,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await GradingSystemService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grading system data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await GradingSystemService.updateIntoDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grading system data updated!',
    data: result,
  });
});

const updateGrade = catchAsync(async (req, res) => {
  const result = await GradingSystemService.updateGrade(
    req.params.gradeId,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grade option data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await GradingSystemService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grading system data deleted!',
    data: result,
  });
});

const deleteGrade = catchAsync(async (req, res) => {
  const result = await GradingSystemService.deleteGrade(req.params.gradeId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Grade option data deleted!',
    data: result,
  });
});

export const GradingSystemController = {
  insertIntoDB,
  addGrade,
  getDefaultGradingSystem,
  getByCourseIdFromDB,
  getByIdFromDB,
  getGradesByAuthorId,
  updateIntoDB,
  updateGrade,
  deleteFromDB,
  deleteGrade,
};
