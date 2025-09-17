import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PaymentService } from './payment.service';
import pick from '../../utils/pick';
import { paymentFilterableFields } from './payment.constants';
import config from '../../config';

const insertIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.initiatePayment(req?.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: 'Payment created successfully',
    data: result,
  });
});

const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const result = await PaymentService.confirmPayment(req.query)

   res.redirect(
    `${config.payment_success_url}`,
  )
  
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    data: result,
    message: 'payment initiate successfully',
  })
})

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

const refundPayment = catchAsync(async (req, res) => {
  const result = await PaymentService.refundPayment(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payment refund successfully!',
    data: result,
  })
})

export const PaymentController = {
  insertIntoDB,
  confirmPayment,
  getAllIntoDB,
  getByAuthorIntoDB,
  getMyAllIntoDB,
  getByIdIntoDB,
  updateIntoDB,
  deleteIntoDB,
  refundPayment
};
