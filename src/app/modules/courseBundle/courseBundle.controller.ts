import { CourseBundleService } from './courseBundle.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { courseBundleFilterableFields } from './courseBundle.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await CourseBundleService.insertIntoDB(req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course bundle insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseBundleFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const filterBy = {
    authorId: req.query.authorId as string | undefined,
    companyId: req.query.companyId as string | undefined,
  };

  const result = await CourseBundleService.getAllFromDB(
    filters,
    options,
    filterBy,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Courses bundle data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getMyCourseFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseBundleFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseBundleService.getAllFromDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Courses bundle data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByCompanyFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseBundleFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await CourseBundleService.getAllFromDB(filters, options, {
    companyId: req.params.companyId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My Courses bundle data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CourseBundleService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course bundle data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CourseBundleService.updateIntoDB(
    req.params.id,
    req.body,
    req.file,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course bundle data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CourseBundleService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Course bundle data deleted!',
    data: result,
  });
});

export const CourseBundleController = {
  insertIntoDB,
  getAllFromDB,
  getMyCourseFromDB,
  getByCompanyFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
