import httpStatus from 'http-status';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import axios from 'axios';
import config from '../../config';
import { IZoomMeeting } from './zoom.interface';

// Handle OAuth Callback (Save Zoom Account)
// Handle OAuth Callback (Save Zoom Account)
const handleOAuthCallback = async (code: string) => {
  console.log("🚀 ~ handleOAuthCallback ~ code:", code)
  try {
    const tokenResponse = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.zoom.redirect_url,
        },
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.zoom.client_id}:${config.zoom.client_secret}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get user info from Zoom
    const userInfo = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    // Save or update Zoom account
    let zoomAccount = await prisma.zoomAccount.findFirst({
      where: { userId: userInfo.data.id },
    });

    if (zoomAccount) {
      zoomAccount = await prisma.zoomAccount.update({
        where: { id: zoomAccount.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
        },
      });
    } else {
      zoomAccount = await prisma.zoomAccount.create({
        data: {
          userId: userInfo.data.id,
          zoomUserId: userInfo.data.id,
          email: userInfo.data.email,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
        },
      });
    }

    return zoomAccount;
  } catch (error: any) {
    console.error(error.response?.data);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Zoom OAuth failed!');
  }
};

// Refresh Access Token
const refreshAccessToken = async (userId: string) => {
  const account = await prisma.zoomAccount.findFirst({ where: { userId } });
  if (!account)
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom account not found!');

  try {
    const refreshResponse = await axios.post(
      'https://zoom.us/oauth/token',
      null,
      {
        params: {
          grant_type: 'refresh_token',
          refresh_token: account.refreshToken,
        },
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${config.zoom.client_id}:${config.zoom.client_secret}`,
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const updated = await prisma.zoomAccount.update({
      where: { id: account.id },
      data: {
        accessToken: refreshResponse.data.access_token,
        refreshToken: refreshResponse.data.refresh_token,
        expiresAt: new Date(
          Date.now() + refreshResponse.data.expires_in * 1000,
        ),
      },
    });

    return updated;
  } catch (error) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Token refresh failed!',
    );
  }
};

// Create Meeting
const createMeeting = async (payload: IZoomMeeting) => {
  const { userId, topic, startTime, duration, agenda, timezone } = payload;

  const account = await prisma.zoomAccount.findFirst({ where: { userId } });
  if (!account)
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom account not found');

  const response = await axios.post(
    `https://api.zoom.us/v2/users/me/meetings`,
    {
      topic: topic || 'New Meeting',
      agenda: agenda || '',
      type: 2,
      start_time:
        startTime || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      duration: duration || 60,
      timezone: timezone || 'UTC',
      settings: {
        host_video: true,
        participant_video: true,
      },
    },
    { headers: { Authorization: `Bearer ${account.accessToken}` } },
  );

  const m = response.data;

  return await prisma.zoomMeeting.create({
    data: {
      zoomAccountId: account.id,
      zoomMeetingId: m.id.toString(),
      topic: m.topic,
      agenda: m.agenda,
      startUrl: m.start_url,
      joinUrl: m.join_url,
      password: m.password,
      duration: m.duration,
      startTime: new Date(m.start_time),
      endTime: new Date(new Date(m.start_time).getTime() + m.duration * 60000),
      timezone: m.timezone,
    },
  });
};

export const ZoomService = {
  handleOAuthCallback,
  refreshAccessToken,
  createMeeting,
};
