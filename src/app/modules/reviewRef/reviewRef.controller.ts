import { ReviewRefService } from './reviewRef.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { reviewRefFilterableFields } from './reviewRef.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await ReviewRefService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review ref insert successfully!',
    data: result,
  });
});

const getAllByReviewFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, reviewRefFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ReviewRefService.getAllFromDB(filters, options, req.params.reviewId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Reviews ref data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await ReviewRefService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review ref data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await ReviewRefService.updateIntoDB(
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
  const result = await ReviewRefService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Review ref data deleted!',
    data: result,
  });
});

export const ReviewRefController = {
  insertIntoDB,
  getAllByReviewFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
