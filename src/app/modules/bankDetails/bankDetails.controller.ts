import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { BankDetailsServices } from './bankDetails.service';
import { bankDetailsFilterableFields } from './bankDetails.constant';
import pick from '../../utils/pick';

const insertIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await BankDetailsServices.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankDetails created successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, bankDetailsFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await BankDetailsServices.getAllFromDB(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'All BankDetails retrieval successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getAllMyFromDB = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, bankDetailsFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await BankDetailsServices.getAllFromDB(
    filters,
    options,
    req.user!.userId,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My BankDetails retrieval successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req: Request, res: Response) => {
  const result = await BankDetailsServices.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankDetails fetched successfully',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await BankDetailsServices.updateIntoDB(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'BankDetails data updated successfully!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await BankDetailsServices.deleteFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'BankDetails delete successfully!',
    data: result,
  });
});

export const BankDetailsController = {
  insertIntoDB,
  getAllFromDB,
  getAllMyFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
