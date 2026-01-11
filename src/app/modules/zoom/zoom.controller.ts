import httpStatus from 'http-status';
import { Request, Response } from 'express';
import { ZoomService } from './zoom.service';
import config from '../../config';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const redirectToZoomAuth = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user!.userId;

  if (!config.zoom.redirect_url) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Zoom redirect URL is not configured',
    );
  }

  const state = Buffer.from(
    JSON.stringify({ userId: currentUserId, timestamp: Date.now() }),
  ).toString('base64');

  const authUrl = `https://zoom.us/oauth/authorize?response_type=code&client_id=${config.zoom.client_id}&redirect_uri=${encodeURIComponent(config.zoom.redirect_url)}&state=${state}`;

  // Frontend-এ authUrl পাঠাও (redirect না করে)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom auth URL generated',
    data: { authUrl },
  });
});

// Handle Zoom OAuth Callback
const zoomAuthCallback = catchAsync(async (req: Request, res: Response) => {
  const { code, state } = req.query;
  if (!code) throw new ApiError(httpStatus.BAD_REQUEST, 'Missing code!');
  if (!state) throw new ApiError(httpStatus.BAD_REQUEST, 'Missing state!');

  let currentUserId: string;
  try {
    const decoded = JSON.parse(
      Buffer.from(state as string, 'base64').toString(),
    );
    currentUserId = decoded.userId;

    if (Math.abs(Date.now() - decoded.timestamp) > 15 * 60 * 1000) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'State expired!');
    }
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid state!');
  }

  const result = await ZoomService.handleOAuthCallback(
    code as string,
    currentUserId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom connected successfully!',
    data: { accessToken: result.accessToken },
  });
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

  console.log({ account });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: account ? 'Zoom account is connected' : 'No Zoom account found',
    data: !!account,
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
  getZoomAccount,
};
