import { AffiliateService } from './affiliates.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { affiliateSearchAbleFields } from './affiliates.constant';

const createAffiliatesAccount = catchAsync(async (req, res) => {
  const result = await AffiliateService.createAffiliateAccount(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate account created successfully!',
    data: result,
  });
});

const getAffiliatesAccount = catchAsync(async (req, res) => {
  const result = await AffiliateService.getAffiliateAccount(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate account retrieve successfully!',
    data: result,
  });
});

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await AffiliateService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate insert successfully!',
    data: result,
  });
});

const getMyAffiliateFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, affiliateSearchAbleFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await AffiliateService.getAllFromDB(filters, options, req.user?.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Affiliates data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await AffiliateService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await AffiliateService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await AffiliateService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Affiliate data deleted!',
    data: result,
  });
});

export const AffiliateController = {
  insertIntoDB,
  createAffiliatesAccount,
  getAffiliatesAccount,
  getMyAffiliateFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
