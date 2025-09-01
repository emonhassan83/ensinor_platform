import { EventScheduleService } from './eventSchedule.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { eventScheduleFilterableFields } from './eventSchedule.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await EventScheduleService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event schedule insert successfully!',
    data: result,
  });
});

const getAllByEventFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventScheduleFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventScheduleService.getAllFromDB(filters, options, req.params.eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event schedule data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await EventScheduleService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event schedule data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await EventScheduleService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event schedule data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await EventScheduleService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event schedule data deleted!',
    data: result,
  });
});

export const EventScheduleController = {
  insertIntoDB,
  getAllByEventFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
