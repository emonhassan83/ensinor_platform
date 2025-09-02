import { WithdrawRequestService } from './withdrawRequest.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { withdrawRequestFilterableFields } from './withdrawRequest.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review ref insert successfully!',
    data: result,
  });
});

const getAllByUserFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, withdrawRequestFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await WithdrawRequestService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews ref data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review ref data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review ref data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review ref data deleted!',
    data: result,
  });
});

export const WithdrawRequestController = {
  insertIntoDB,
  getAllByUserFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
