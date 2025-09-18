import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { MetaService } from './meta.service';

const superAdminMetaDashboard = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaDashboard(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin meta dashboard data retrieval successfully!',
    data: result,
  });
});

const superAdminRevenueAnalysis = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminRevenueAnalysis(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin revenue analysis retrieval successfully!',
    data: result,
  });
});

const superAdminEnrolmentAnalysis = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminEnrollmentAnalysis(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin enrolment analysis retrieval successfully!',
    data: result,
  });
});

const superAdminContentAnalysis = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminContentAnalysis(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin content analysis retrieval successfully!',
    data: result,
  });
});

const superAdminUserAnalysis = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminUserAnalysis(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin user analysis retrieval successfully!',
    data: result,
  });
});

const superAdminSubscriptionAnalysis = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminSubscriptionAnalysis(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin subscription analysis retrieval successfully!',
    data: result,
  });
});

const companyAdminMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.companyAdminMetaData(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company admin meta data retrieval successfully!',
    data: result,
  });
});

const businessInstructorMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.businessInstructorMetaData(req.user);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business Instructor meta data retrieval successfully!',
    data: result
  });
});

const employeeMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaDashboard(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Employee meta data retrieval successfully!',
    data: result,
  });
});

const instructorMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaDashboard(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Instructor meta data retrieval successfully!',
    data: result,
  });
});

const coInstructorMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaDashboard(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Co-Instructor meta data retrieval successfully!',
    data: result,
  });
});
const studentMetaData = catchAsync(async (req, res) => {
  const result = await MetaService.superAdminMetaDashboard(req.user, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student meta data retrieval successfully!',
    data: result,
  });
});

export const MetaController = {
  superAdminMetaDashboard,
  superAdminRevenueAnalysis,
  superAdminEnrolmentAnalysis,
  superAdminContentAnalysis,
  superAdminUserAnalysis,
  superAdminSubscriptionAnalysis,
  companyAdminMetaData,
  businessInstructorMetaData,
  employeeMetaData,
  instructorMetaData,
  coInstructorMetaData,
  studentMetaData,
};
