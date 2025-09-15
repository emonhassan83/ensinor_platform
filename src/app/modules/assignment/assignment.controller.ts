import { AssignmentService } from './assignment.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { assignmentFilterableFields } from './assignment.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await AssignmentService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment insert successfully!',
    data: result,
  });
});

const getAllAuthorAssignment = catchAsync(async (req, res) => {
  const filters = pick(req.query, assignmentFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AssignmentService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All author Assignment data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllCourseAssignment = catchAsync(async (req, res) => {
  const filters = pick(req.query, assignmentFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AssignmentService.getAllFromDB(filters, options, {
    courseId: req.params.courseId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All course Assignment data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await AssignmentService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await AssignmentService.updateIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await AssignmentService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment data deleted!',
    data: result,
  });
});

export const AssignmentController = {
  insertIntoDB,
  getAllAuthorAssignment,
  getAllCourseAssignment,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
