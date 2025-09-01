import { EventSpeakerService } from './eventSpeaker.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { eventSpeakerFilterableFields } from './eventSpeaker.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await EventSpeakerService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event speaker insert successfully!',
    data: result,
  });
});

const getByScheduleFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventSpeakerFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventSpeakerService.getAllFromDB(filters, options, req.params.scheduleId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event speaker data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByEventFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventSpeakerFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventSpeakerService.getAllFromDB(filters, options, req.params.eventId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event speaker data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await EventSpeakerService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event speaker data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await EventSpeakerService.updateIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event speaker data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await EventSpeakerService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event speaker data deleted!',
    data: result,
  });
});

export const EventSpeakerController = {
  insertIntoDB,
  getByScheduleFromDB,
  getByEventFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
