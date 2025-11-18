import { CertificateBuilderService } from './certificateBuilder.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CertificateBuilderService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate builder insert successfully!',
    data: result,
  });
});

const getByAuthorIdFromDB = catchAsync(async (req, res) => {
  const result = await CertificateBuilderService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My certificate builder data fetched!',
    data: result,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CertificateBuilderService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate Builder data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CertificateBuilderService.updateIntoDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate Builder data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CertificateBuilderService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Certificate Builder data deleted!',
    data: result,
  });
});

export const CertificateBuilderController = {
  insertIntoDB,
  getByAuthorIdFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
