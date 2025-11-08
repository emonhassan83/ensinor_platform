import { EventBookingService } from './eventBooking.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { eventBookingFilterableFields } from './eventBooking.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await EventBookingService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event booking insert successfully!',
    data: result,
  });
});

const bulkInsertIntoDB = catchAsync(async (req, res) => {
  const result = await EventBookingService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event booking insert successfully!',
    data: result,
  });
});

const getByAuthorFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventBookingFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventBookingService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My events booking data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByUserFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventBookingFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventBookingService.getAllFromDB(filters, options, {
    userId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My events booking data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await EventBookingService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event booking data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await EventBookingService.updateIntoDB(
    req.params.id,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event booking data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await EventBookingService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event booking data deleted!',
    data: result,
  });
});

export const EventBookingController = {
  insertIntoDB,
  bulkInsertIntoDB,
  getByAuthorFromDB,
  getByUserFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
