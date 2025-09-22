import { ShopService } from './shop.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { shopFilterableFields } from './shop.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await ShopService.insertIntoDB(req.body, req.files);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shop book insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, shopFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ShopService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shop books data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyShopFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, shopFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ShopService.getAllFromDB(filters, options, {
    authorId: req.user!.userId
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My shop books data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByCompanyFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, shopFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ShopService.getAllFromDB(filters, options, {
    companyId: req.params.companyId
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My shop books data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await ShopService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shop book data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await ShopService.updateIntoDB(
    req.params.id,
    req.body,
    req.files,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shop book data updated!',
    data: result,
  });
});

const changeStatusIntoDB = catchAsync(async (req, res) => {
  const result = await ShopService.changeStatusIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shop book status data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await ShopService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Shop book data deleted!',
    data: result,
  });
});

export const ShopController = {
  insertIntoDB,
  getAllFromDB,
  getMyShopFromDB,
  getByCompanyFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB,
};
