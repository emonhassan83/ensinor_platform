import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { ReportsService } from './reports.service';
import pick from '../../utils/pick';
import {
  businessSearchableFields,
  courseSearchableFields,
  eventSearchableFields,
  studentSearchableFields,
} from './reports.constant';

const studentReports = catchAsync(async (req, res) => {
  const filters = pick(req.query, studentSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.studentReports(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Student reports retrieval successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const courseReports = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.courseReports(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course reports retrieval successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const revenueReports = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.revenueReports(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Revenue reports retrieval successfully!',
    data: result,
  });
});

const businessReports = catchAsync(async (req, res) => {
  const filters = pick(req.query, businessSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.businessReports(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business reports retrieval successfully!',
    data: result,
  });
});

const eventReports = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.eventReports(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event reports retrieval successfully!',
    data: result,
  });
});

// const superAdminSubscriptionAnalysis = catchAsync(async (req, res) => {
//   const result = await ReportsService.superAdminSubscriptionAnalysis(
//     req.user,
//     req.query,
//   );

//   sendResponse(res, {
//     statusCode: httpStatus.OK,
//     success: true,
//     message: 'Admin subscription analysis retrieval successfully!',
//     data: result,
//   });
// });

export const ReportsController = {
  studentReports,
  courseReports,
  revenueReports,
  businessReports,
  eventReports,
};
