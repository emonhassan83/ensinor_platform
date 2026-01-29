import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { stripeService } from './stripe.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import config from '../../config';

const stripLinkAccount = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.stripLinkAccount(req?.user?.userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Account creation URL generated successfully.',
    data: result,
  });
});

// checked stripe connected
const checkStripeConnected = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.checkStripeConnected(req?.user?.userId);
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result ? 'Stripe account is connected.' : 'Stripe account is not connected.',
    data: result,
  });
});

const handleStripeOAuth = catchAsync(async (req: Request, res: Response) => {
  try {
    await stripeService.handleStripeOAuth(req.query, req.user?.userId);
    res.redirect(`${config.client_dashboard_url}/dashboard?stripe=connected`);
  } catch (error: any) {
    console.error('OAuth error:', error);
    res.redirect(`${config.client_dashboard_url}/dashboard?stripe=error`);
  }
});

const refresh = catchAsync(async (req: Request, res: Response) => {
  const result = await stripeService.refresh(req.params?.id, req.query);

  // Remove sendResponse after res.redirect to avoid setting headers twice
  res.redirect(result);
});

const returnUrl = catchAsync(async (req: Request, res: Response) => {
  try {
    const result = await stripeService.returnUrl(req.query);
    res.redirect(result.url);
  } catch (error: any) {
    console.error('Return URL error:', error);
    res.redirect(`${config.client_dashboard_url}/dashboard?stripe=error`);
  }
});

export const stripeController = {
  stripLinkAccount,
  checkStripeConnected,
  handleStripeOAuth,
  refresh,
  returnUrl,
};
