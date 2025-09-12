import httpStatus from 'http-status';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { IZoomAccount, IZoomMeeting } from './zoom.interface';
import axios from 'axios';
import { UserStatus } from '@prisma/client';

const connectZoomAccount = async (payload: IZoomAccount) => {
  const { userId } = payload;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Check duplicate account by userId
  const existing = await prisma.zoomAccount.findFirst({
    where: { userId: payload.userId },
  });
  if (existing) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This user already has a connected Zoom account!',
    );
  }

  const result = await prisma.zoomAccount.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Zoom account creation failed!');
  }

  return result;
};

// Refresh Token
const refreshAccessToken = async (userId: string) => {
  const account = await prisma.zoomAccount.findFirst({ where: { userId } });
  if (!account)
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom account not found');

  // Zoom token refresh API call here
  try {
    const response = await axios.post('https://zoom.us/oauth/token', null, {
      params: {
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      },
      auth: {
        username: process.env.ZOOM_CLIENT_ID!,
        password: process.env.ZOOM_CLIENT_SECRET!,
      },
    });

    const updated = await prisma.zoomAccount.update({
      where: { id: account.id },
      data: {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      },
    });

    return updated;
  } catch (error: any) {
    if (error.response && error.response.status === 400) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Invalid refresh token or token expired!',
      );
    }
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to refresh Zoom token!',
    );
  }
};

// Create Meeting
const createMeeting = async (payload: IZoomMeeting) => {
  const account = await prisma.zoomAccount.findFirst({
    where: { userId: payload.userId },
  });
  if (!account)
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom account not found');

  // Token expire check
  if (new Date() > account.expiresAt) {
    await refreshAccessToken(account.userId);
  }

  const response = await axios.post(
    `https://api.zoom.us/v2/users/${account.zoomUserId}/meetings`,
    {
      topic: payload.topic,
      agenda: payload.agenda,
      duration: payload.duration,
      start_time: payload.startTime,
      type: 2,
    },
    { headers: { Authorization: `Bearer ${account.accessToken}` } },
  );

  const result = await prisma.zoomMeeting.create({
    data: {
      zoomAccountId: account.id,
      zoomMeetingId: response.data.id.toString(),
      topic: response.data.topic,
      agenda: response.data.agenda,
      startUrl: response.data.start_url,
      joinUrl: response.data.join_url,
      password: response.data.password,
      duration: response.data.duration,
      startTime: new Date(response.data.start_time),
      endTime: new Date(
        new Date(response.data.start_time).getTime() +
          response.data.duration * 60000,
      ),
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Zoom meeting creation failed!');
  }
  return result;
};

// Get All Meetings
const getMeetings = async (userId: string) => {
  const meetings = await prisma.zoomMeeting.findMany({
    where: { zoomAccount: { userId } },
  });

  if (!meetings.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No meetings found!');
  }
  return meetings;
};

// Get One Meeting
const getMeeting = async (id: string) => {
  const result = await prisma.zoomMeeting.findUnique({ where: { id } });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom meeting not found!');
  }
  return result;
};

// Update Meeting
const updateMeeting = async (id: string, payload: Partial<IZoomMeeting>) => {
  const { zoomAccountId, ...updateData } = payload;
  const meeting = await prisma.zoomMeeting.findUnique({ where: { id } });
  if (!meeting) throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found');

  await axios.patch(
    `https://api.zoom.us/v2/meetings/${meeting.zoomMeetingId}`,
    payload,
    { headers: { Authorization: `Bearer ${meeting.zoomAccountId}` } },
  );

  const result = await prisma.zoomMeeting.update({
    where: { id },
    data: updateData,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom meeting not updated!');
  }
  return result;
};

// Delete Meeting
const deleteMeeting = async (id: string) => {
  const meeting = await prisma.zoomMeeting.findUnique({ where: { id } });
  if (!meeting) throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found');

  await axios.delete(
    `https://api.zoom.us/v2/meetings/${meeting.zoomMeetingId}`,
    { headers: { Authorization: `Bearer ${meeting.zoomAccountId}` } },
  );

  const result = await prisma.zoomMeeting.delete({ where: { id } });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom meeting not deleted!');
  }
  return result;
};

// Sync Meetings
const syncMeetings = async (userId: string) => {
  const account = await prisma.zoomAccount.findFirst({ where: { userId } });
  if (!account)
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom account not found');

  const response = await axios.get(
    `https://api.zoom.us/v2/users/${account.zoomUserId}/meetings`,
    { headers: { Authorization: `Bearer ${account.accessToken}` } },
  );

  const meetings = response.data.meetings.map((m: any) =>
    prisma.zoomMeeting.upsert({
      where: { zoomMeetingId: m.id.toString() },
      update: {
        topic: m.topic,
        agenda: m.agenda,
        startTime: new Date(m.start_time),
        duration: m.duration,
      },
      create: {
        zoomAccountId: account.id,
        zoomMeetingId: m.id.toString(),
        topic: m.topic,
        agenda: m.agenda,
        startUrl: m.start_url,
        joinUrl: m.join_url,
        password: m.password,
        duration: m.duration,
        startTime: new Date(m.start_time),
        endTime: new Date(
          new Date(m.start_time).getTime() + m.duration * 60000,
        ),
      },
    }),
  );

  return Promise.all(meetings);
};

export const ZoomService = {
  connectZoomAccount,
  refreshAccessToken,
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  syncMeetings,
};
