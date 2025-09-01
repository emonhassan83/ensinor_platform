import { CertificateService } from './certificate.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { certificateFilterableFields } from './certificate.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CertificateService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate insert successfully!',
    data: result,
  });
});

const getByUserIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, certificateFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CertificateService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate by userId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByCourseIdFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, certificateFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CertificateService.getAllFromDB(filters, options, req.params.courseId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate by courseId data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CertificateService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CertificateService.updateIntoDB(
    req.params.id,
    req.body,
    req.file
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CertificateService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate data deleted!',
    data: result,
  });
});

export const CertificateController = {
  insertIntoDB,
  getByUserIdFromDB,
  getByCourseIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
