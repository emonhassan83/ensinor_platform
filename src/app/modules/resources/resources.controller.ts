import { ResourceService } from './resources.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { resourceFilterableFields } from './resources.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await ResourceService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resource insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, resourceFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ResourceService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resources data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllByReferenceFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, resourceFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ResourceService.getAllFromDB(filters, options, req.params.referenceId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resources data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await ResourceService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resource data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await ResourceService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resource data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await ResourceService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resource data deleted!',
    data: result,
  });
});

export const ResourceController = {
  insertIntoDB,
  getAllFromDB,
  getAllByReferenceFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
