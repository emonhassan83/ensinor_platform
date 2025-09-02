import { CVService } from './cv.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { cvFilterableFields } from './cv.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CVService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CV insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, cvFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CVService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All CV data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyCVFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, cvFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CVService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My CV data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CVService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CV data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CVService.updateIntoDB(
    req.params.id,
    req.body,
    req.file
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CV data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CVService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'CV data deleted!',
    data: result,
  });
});

export const CVController = {
  insertIntoDB,
  getAllFromDB,
  getMyCVFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
