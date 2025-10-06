import { CouponService } from './coupon.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { couponFilterableFields } from './coupon.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CouponService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, couponFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CouponService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupons data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllByReferenceFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, couponFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CouponService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupons data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyCouponsFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, couponFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CouponService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Coupons data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CouponService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CouponService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon data updated!',
    data: result,
  });
});

const changedActiveStatus = catchAsync(async (req, res) => {
  const result = await CouponService.changedActiveStatusIntoDB(
    req.params.id
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon active status updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CouponService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Coupon data deleted!',
    data: result,
  });
});

export const CouponController = {
  insertIntoDB,
  getAllFromDB,
  getAllByReferenceFromDB,
  getMyCouponsFromDB,
  getByIdFromDB,
  updateIntoDB,
  changedActiveStatus,
  deleteFromDB,
};
