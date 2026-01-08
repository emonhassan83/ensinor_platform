import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { ZoomService } from './zoom.service';
import config from '../../config';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import prisma from '../../utils/prisma';

// Redirect to Zoom Authorization
const redirectToZoomAuth = catchAsync(async (req: Request, res: Response) => {
  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${config.zoom.client_id}&redirect_uri=${config.zoom.redirect_url}`;
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom redirect auth link fetch successfully!',
    data: authUrl,
  });
});

// Handle Zoom OAuth Callback
const zoomAuthCallback = catchAsync(async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) {
    throw new Error('Missing authorization code!');
  }

  const result = await ZoomService.handleOAuthCallback(code as string);

  res.send(
    `<h1>✅ Zoom account connected successfully!</h1>
     <p>Access Token: ${result.accessToken}</p>`
  );
});

// Refresh Zoom Token
const refreshZoomToken = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.body;

  const result = await ZoomService.refreshAccessToken(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom token refreshed successfully!',
    data: result,
  });
});

const getZoomAccount = async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const account = await prisma.zoomAccount.findFirst({ where: { userId } });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom token refreshed successfully!',
    data: account ? true : false,
  });
};

// Create Meeting
const createZoomMeeting = catchAsync(async (req: Request, res: Response) => {
  const result = await ZoomService.createMeeting(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Meeting created successfully!',
    data: result,
  });
});

export const ZoomController = {
  redirectToZoomAuth,
  zoomAuthCallback,
  refreshZoomToken,
  createZoomMeeting,
  getZoomAccount
}
