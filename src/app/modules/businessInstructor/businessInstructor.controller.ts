import { BusinessInstructorService } from './businessInstructor.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import { businessInstructorFilterableFields } from './businessInstructor.constant';
import sendResponse from '../../utils/sendResponse';

const getAllFromDB = catchAsync(
  async (req, res) => {
    const filters = pick(req.query, businessInstructorFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const result = await BusinessInstructorService.getAllFromDB(filters, options, req.user!.userId);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Business instructors data fetched!',
      meta: result.meta,
      data: result.data,
    });
  },
);

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await BusinessInstructorService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business instructors data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await BusinessInstructorService.updateIntoDB(req.params.id, req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business instructors data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await BusinessInstructorService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Business instructors data deleted!',
    data: result,
  });
});

export const BusinessInstructorController = {
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB
};
