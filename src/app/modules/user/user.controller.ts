import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.service';
import { userFilterableFields } from './user.constant';
import pick from '../../utils/pick';

const createCompanyAdmin = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const result = await UserServices.createCompanyAdmin(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company admin profile created successfully!',
    data: result,
  });
});

const createBusinessInstructor = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.createBusinessInstructor(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business instructor profile created successfully!',
    data: result,
  });
});

const createEmployee = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.createEmployee(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee profile created successfully!',
    data: result,
  });
});

const createInstructor = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.createInstructor(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Instructor profile created successfully!',
    data: result,
  });
});

const createStudent = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.createStudent(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student profile created successfully!',
    data: result,
  });
});

const changeProfileStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.changeProfileStatus(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully!',
    data: result,
  });
});

const getAllUser = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, userFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await UserServices.getAllUser(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users retrieval successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.getMyProfile(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile data fetched!',
    data: result
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.updateMyProfile(req.user, req);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Update my Profile data Successfully!',
    data: result
  });
});

export const UserController = {
  createCompanyAdmin,
  createBusinessInstructor,
  createEmployee,
  createInstructor,
  createStudent,
  changeProfileStatus,
  getAllUser,
  getMyProfile,
  updateMyProfile
};
