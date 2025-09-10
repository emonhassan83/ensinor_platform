import { PromoCodeService } from './promoCode.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { promoCodeFilterableFields } from './promoCode.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await PromoCodeService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, promoCodeFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await PromoCodeService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo codes data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllByReferenceFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, promoCodeFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await PromoCodeService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo codes data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyPromoCodesFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, promoCodeFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await PromoCodeService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Promo codes data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await PromoCodeService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await PromoCodeService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await PromoCodeService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo code data deleted!',
    data: result,
  });
});

export const PromoCodeController = {
  insertIntoDB,
  getAllFromDB,
  getAllByReferenceFromDB,
  getMyPromoCodesFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
