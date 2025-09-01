import { CertificateRequestService } from './certificateRequest.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { certificateRequestFilterableFields } from './certificateRequest.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CertificateRequestService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate request insert successfully!',
    data: result,
  });
});

const getByUserIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, certificateRequestFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CertificateRequestService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate request by userId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByCourseIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, certificateRequestFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CertificateRequestService.getAllFromDB(filters, options, req.params.courseId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate request by courseId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CertificateRequestService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate request data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CertificateRequestService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate request data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CertificateRequestService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate request data deleted!',
    data: result,
  });
});

export const CertificateRequestController = {
  insertIntoDB,
  getByUserIdFromDB,
  getByCourseIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
