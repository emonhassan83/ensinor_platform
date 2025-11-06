import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { subscriptionService } from './subscription.service';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import { subscriptionFilterableFields } from './subscription.constants';

const createSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionService.createSubscription(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription created successfully !',
    data: result,
  });
});

const getMySubscription = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, subscriptionFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await subscriptionService.getAllSubscription(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'My subscriptions fetched successfully !',
    data: result,
  });
});

const getSubscriptionById = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionService.getSubscriptionById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription fetched successfully !',
    data: result,
  });
});

const updateSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionService.updateSubscription(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription updated successfully',
    data: result,
  });
});

const deleteSubscription = catchAsync(async (req: Request, res: Response) => {
  const result = await subscriptionService.deleteSubscription(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Subscription deleted successfully',
    data: result,
  });
});

export const subscriptionController = {
  createSubscription,
  getSubscriptionById,
  updateSubscription,
  deleteSubscription,
  getMySubscription,
};
