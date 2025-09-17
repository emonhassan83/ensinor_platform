import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { MetaService } from './meta.service';

const superAdminMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaData(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});

const companyAdminMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaData(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});

const businessInstructorMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaData(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});

const employeeMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaData(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});

const instructorMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaData(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});

const coInstructorMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaData(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});
const studentMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaData(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meta data retrieval successfully!',
    data: result,
  });
});

export const MetaController = {
  superAdminMetaData,
  companyAdminMetaData,
  businessInstructorMetaData,
  employeeMetaData,
  instructorMetaData,
  coInstructorMetaData,
  studentMetaData,
};
