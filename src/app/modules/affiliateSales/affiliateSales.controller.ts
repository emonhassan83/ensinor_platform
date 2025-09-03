import { AffiliateSaleService } from './affiliateSales.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { affiliateSaleSearchAbleFields } from './affiliateSales.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await AffiliateSaleService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate sale insert successfully!',
    data: result,
  });
});


const getAllByCourseFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, affiliateSaleSearchAbleFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AffiliateSaleService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate sales data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyAffiliateFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, affiliateSaleSearchAbleFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AffiliateSaleService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My affiliate sales data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await AffiliateSaleService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate sale data fetched by id!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await AffiliateSaleService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate sale data deleted!',
    data: result,
  });
});

export const AffiliateSaleController = {
  insertIntoDB,
  getAllByCourseFromDB,
  getMyAffiliateFromDB,
  getByIdFromDB,
  deleteFromDB,
};
