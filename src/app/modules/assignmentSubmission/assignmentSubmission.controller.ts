import { AssignmentSubmissionService } from './assignmentSubmission.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { assignmentSubmissionFilterableFields } from './assignmentSubmission.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await AssignmentSubmissionService.insertIntoDB(
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment submission successfully!',
    data: result,
  });
});

const resubmitAssignmentIntoDB = catchAsync(async (req, res) => {
  const result = await AssignmentSubmissionService.resubmitAssignmentIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment re-submission successfully!',
    data: result,
  });
});

const getAuthorAssignmentSubmission = catchAsync(async (req, res) => {
  const filters = pick(req.query, assignmentSubmissionFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AssignmentSubmissionService.getAllFromDB(
    filters,
    options,
    {
      authorId: req.user!.userId,
    },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Author Assignment submission data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getCourseAssignmentSubmission = catchAsync(async (req, res) => {
  const filters = pick(req.query, assignmentSubmissionFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AssignmentSubmissionService.getAllFromDB(
    filters,
    options,
    {
      assignmentId: req.params.assignmentId,
    },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course assignment submission data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyAssignmentSubmission = catchAsync(async (req, res) => {
  const filters = pick(req.query, assignmentSubmissionFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AssignmentSubmissionService.getAllFromDB(
    filters,
    options,
    {
      userId: req.user!.userId,
    },
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My assignment submission data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await AssignmentSubmissionService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment submission data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await AssignmentSubmissionService.updateIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment submission data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await AssignmentSubmissionService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assignment submission data deleted!',
    data: result,
  });
});

export const AssignmentSubmissionController = {
  insertIntoDB,
  resubmitAssignmentIntoDB,
  getAuthorAssignmentSubmission,
  getCourseAssignmentSubmission,
  getMyAssignmentSubmission,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
