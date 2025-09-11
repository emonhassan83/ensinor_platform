import { ResourceService } from './resources.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { resourceFilterableFields } from './resources.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await ResourceService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resource insert successfully!',
    data: result,
  });
});

const getAllMyFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, resourceFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  
  const result = await ResourceService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resources data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllByCourseFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, resourceFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ResourceService.getAllFromDB(filters, options, {
    courseId: req.params.courseId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resources data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllByBookFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, resourceFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ResourceService.getAllFromDB(filters, options, {
    bookId: req.params.bookId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Resources data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllByEventFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, resourceFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await ResourceService.getAllFromDB(filters, options, {
    eventId: req.params.eventId,
  });

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
  const result = await ResourceService.updateIntoDB(req.params.id, req.body, req.file);
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
  getAllMyFromDB,
  getAllByCourseFromDB,
  getAllByBookFromDB,
  getAllByEventFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
