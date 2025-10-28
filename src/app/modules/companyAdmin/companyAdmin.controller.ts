import { CompanyAdminService } from './companyAdmin.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import { companyAdminFilterableFields } from './companyAdmin.constant';
import sendResponse from '../../utils/sendResponse';

const getAllFromDB = catchAsync(
  async (req, res) => {
    const filters = pick(req.query, companyAdminFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const result = await CompanyAdminService.getAllFromDB(filters, options);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Company admin data fetched!',
      meta: result.meta,
      data: result.data,
    });
  },
);

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await CompanyAdminService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company admin data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await CompanyAdminService.updateIntoDB(req.params.id, req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company admin data updated!',
    data: result,
  });
});

const changedBranding = catchAsync(async (req, res) => {
  const result = await CompanyAdminService.changedBranding(req.user!.userId, req.body, req.file);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company branding data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CompanyAdminService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Company admin data deleted!',
    data: result,
  });
});

export const CompanyAdminController = {
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changedBranding,
  deleteFromDB
};
