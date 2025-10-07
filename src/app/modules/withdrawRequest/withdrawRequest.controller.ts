import { WithdrawRequestService } from './withdrawRequest.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { withdrawRequestFilterableFields } from './withdrawRequest.constant';
import { WithdrawPayoutType } from '@prisma/client';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Withdraw insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, withdrawRequestFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await WithdrawRequestService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All withdraw request data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAuthorPayout = catchAsync(async (req, res) => {
  const filters = pick(req.query, withdrawRequestFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await WithdrawRequestService.getAuthorPayout(
    filters,
    options,
    WithdrawPayoutType.author_payout,
    req.user!.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My withdraw record data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getCoInstructorPayout = catchAsync(async (req, res) => {
  const filters = pick(req.query, withdrawRequestFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await WithdrawRequestService.getAuthorPayout(
    filters,
    options,
    WithdrawPayoutType.coInstructor_payout,
    req.user!.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My withdraw record data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Withdraw data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.updateIntoDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Withdraw data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await WithdrawRequestService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Withdraw data deleted!',
    data: result,
  });
});

export const WithdrawRequestController = {
  insertIntoDB,
  getAllFromDB,
  getAuthorPayout,
  getCoInstructorPayout,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
