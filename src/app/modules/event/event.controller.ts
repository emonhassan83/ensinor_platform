import { EventService } from './event.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { eventFilterableFields } from './event.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await EventService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Events data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const eventFilterData = catchAsync(async (req, res) => {
  const result = await EventService.eventFilterData();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Events filter data fetched!',
    data: result,
  });
});

const getMyEventFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Events data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getCompanyEventFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, eventFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await EventService.getAllFromDB(filters, options, {
    companyId: req.params.companyId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Author Events data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await EventService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await EventService.updateIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await EventService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Event data deleted!',
    data: result,
  });
});

export const EventController = {
  insertIntoDB,
  getAllFromDB,
  eventFilterData,
  getMyEventFromDB,
  getCompanyEventFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
