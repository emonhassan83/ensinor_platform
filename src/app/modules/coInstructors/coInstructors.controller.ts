import { CoInstructorService } from './coInstructors.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import { coInstructorsFilterableFields } from './coInstructors.constant';
import sendResponse from '../../utils/sendResponse';

// Invite Co-Instructor
const inviteCoInstructor = catchAsync(async (req, res) => {
  const result = await CoInstructorService.inviteCoInstructor(req.user!.userId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Co-Instructor invited successfully',
    data: result,
  });
});

const getAllFromDB = catchAsync(
  async (req, res) => {
    const filters = pick(req.query, coInstructorsFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const result = await CoInstructorService.getAllFromDB(filters, options, req.user!.userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Co-Instructor data fetched!',
      meta: result.meta,
      data: result.data,
    });
  },
);

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CoInstructorService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Co-Instructor data fetched by id!',
    data: result,
  });
});

const getCoInstructorCourses = catchAsync(async (req, res) => {
  const result = await CoInstructorService.getCoInstructorCourses(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Assigned courses fetched successfully',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CoInstructorService.updateIntoDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Co-Instructor data updated!',
    data: result,
  });
});

const revokeAccess = catchAsync(async (req, res) => {
  const result = await CoInstructorService.revokeAccess(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Co-Instructor access revoked !',
    data: result,
  });
});

export const CoInstructorController = {
  inviteCoInstructor,
  getAllFromDB,
  getByIdFromDB,
  getCoInstructorCourses,
  updateIntoDB,
  revokeAccess
};
