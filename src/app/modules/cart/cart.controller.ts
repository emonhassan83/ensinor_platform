import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { CartServices } from './cart.service';

const insertIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await CartServices.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cart created successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req: Request, res: Response) => {
  const result = await CartServices.getAllFromDB(req.user!.userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cart product retrieval successfully',
    data: result,
  });
});

const getByIdFromDB = catchAsync(async (req: Request, res: Response) => {
  const result = await CartServices.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Cart fetched successfully',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await CartServices.deleteFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Cart delete successfully!',
    data: result,
  });
});

export const CartController = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  deleteFromDB,
};
