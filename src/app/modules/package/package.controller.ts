import { PackageService } from './package.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { packageFilterableFields } from './package.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await PackageService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Package insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(
  async (req, res) => {
    const filters = pick(req.query, packageFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const result = await PackageService.getAllFromDB(filters, options);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Package data fetched!',
      meta: result.meta,
      data: result.data,
    });
  },
);

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await PackageService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Package data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await PackageService.updateIntoDB(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Package data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await PackageService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Package data deleted!',
    data: result,
  });
});

export const PackageController = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB
};
