import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';
import pick from '../../utils/pick';
import { paymentFilterableFields } from './payment.constants';

const insertIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.insertIntoDB(req?.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payment created successfully',
    data: result,
  });
});

const getAllIntoDB = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, paymentFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await PaymentService.getAllIntoDB(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All Payments fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getByAuthorIntoDB = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, paymentFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await PaymentService.getAllIntoDB(filters, options, {
    authorId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'All Payments fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getMyAllIntoDB = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, paymentFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortPayment']);
  const result = await PaymentService.getAllIntoDB(filters, options, {
    userId: req.user!.userId,
  });

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'My Payments fetched successfully',
    data: result,
  });
});

const getByIdIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.getByIdIntoDB(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment fetched successfully',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.updateIntoDB(req.params.id, req.body);

  let message = 'Payment updated successfully';

  if (req?.body?.status) {
    message = 'Payment status updated successfully';
  }

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message,
    data: result,
  });
});

const deleteIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.deleteIntoDB(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Payment deleted successfully',
    data: result,
  });
});

export const PaymentController = {
  insertIntoDB,
  getAllIntoDB,
  getByAuthorIntoDB,
  getMyAllIntoDB,
  getByIdIntoDB,
  updateIntoDB,
  deleteIntoDB
};
