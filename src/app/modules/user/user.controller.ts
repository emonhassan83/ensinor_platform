import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { UserServices } from './user.service';
import { userFilterableFields } from './user.constant';
import pick from '../../utils/pick';
import { otpServices } from '../otp/otp.service';
import { uploadToS3 } from '../../utils/s3';

const registerAUser = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.photoUrl = await uploadToS3({
      file: req.file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }
  const result = await UserServices.registerAUser(req.body);
  const sendOtp = await otpServices.resendOtp(result?.email);
  const { id, name, email, photoUrl, contactNo, status } = result;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company admin profile created successfully!',
    data: {
      user: { id, name, email, photoUrl, contactNo, status },
      otpInfo: sendOtp,
    },
  });
});

const invitationCompanyAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.invitationCompanyAdmin(req.body);
  const { id, name, email, photoUrl, contactNo, status } = result;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company admin profile created successfully!',
    data: {
      id,
      name,
      email,
      photoUrl,
      contactNo,
      status,
    },
  });
});

const createBusinessInstructor = catchAsync(
  async (req: Request, res: Response) => {
    const result = await UserServices.createBusinessInstructor(req.body);
    const { id, name, email, photoUrl, contactNo, status } = result;
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Business instructor profile created successfully!',
      data: { id, name, email, photoUrl, contactNo, status },
    });
  },
);

const createEmployee = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.photoUrl = await uploadToS3({
      file: req.file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

  const result = await UserServices.createEmployee(req.body);
  const { id, name, email, photoUrl, contactNo, status } = result;
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee profile created successfully!',
    data: { id, name, email, photoUrl, contactNo, status },
  });
});

const createInstructor = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.createInstructor(req.body);
  const { id, name, email, photoUrl, contactNo, status } = result;
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Instructor profile request successfully!',
    data: { id, name, email, photoUrl, contactNo, status },
  });
});

const invitationInstructor = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.invitationInstructor(req.body);
  const { id, name, email, photoUrl, contactNo, status } = result;
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Instructor profile invitation successfully!',
    data: { id, name, email, photoUrl, contactNo, status },
  });
});

const createStudent = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.createStudent(req.body);
  const { id, name, email, photoUrl, contactNo, status } = result;
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student profile created successfully!',
    data: { id, name, email, photoUrl, contactNo, status },
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

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.geUserById(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User fetched successfully',
    data: result,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.geUserById(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Profile data fetched!',
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.photoUrl = await uploadToS3({
      file: req.file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }

  const result = await UserServices.updateAProfile(req.user!.userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Update my Profile data Successfully!',
    data: result,
  });
});

const updateAProfile = catchAsync(async (req: Request, res: Response) => {
  if (req?.file) {
    req.body.photoUrl = await uploadToS3({
      file: req.file,
      fileName: `images/user/photoUrl/${Math.floor(100000 + Math.random() * 900000)}`,
    });
  }
  const result = await UserServices.updateAProfile(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Update my Profile data Successfully!',
    data: result,
  });
});

const changeProfileStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.changeProfileStatus(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User status updated successfully!',
    data: result,
  });
});

const deleteAUser = catchAsync(async (req, res) => {
  const result = await UserServices.deleteAProfile(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'User delete successfully!',
    data: result,
  });
});

const deleteMyProfile = catchAsync(async (req, res) => {
  const result = await UserServices.deleteAProfile(req.user!.userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'My profile delete successfully!',
    data: result,
  });
});

export const UserController = {
  registerAUser,
  invitationCompanyAdmin,
  createBusinessInstructor,
  createEmployee,
  createInstructor,
  invitationInstructor,
  createStudent,
  changeProfileStatus,
  getAllUser,
  getUserById,
  getMyProfile,
  updateMyProfile,
  updateAProfile,
  deleteAUser,
  deleteMyProfile,
};
