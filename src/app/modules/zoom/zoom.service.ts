import httpStatus from 'http-status';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import axios from 'axios';
import config from '../../config';
import { IZoomFilterRequest, IZoomMeeting } from './zoom.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { Prisma, ZoomMeeting } from '@prisma/client';
import { zoomSearchAbleFields } from './zoom.constant';

// Handle OAuth Callback (Save Zoom Account)
// zoom.service.ts
const handleOAuthCallback = async (code: string, currentUserId: string) => {
  console.log('🚀 ~ handleOAuthCallback ~ code:', code);
  console.log('Current App User ID:', currentUserId); // ডিবাগ

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
            `${config.zoom.client_id}:${config.zoom.client_secret}`,
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Get Zoom user info
    const userInfo = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const zoomUserId = userInfo.data.id; // Zoom-এর ID
    const zoomEmail = userInfo.data.email;

    // Check if already connected for THIS app user
    let zoomAccount = await prisma.zoomAccount.findFirst({
      where: { userId: currentUserId }, // ← আপনার অ্যাপের userId
    });

    if (zoomAccount) {
      // Update existing
      zoomAccount = await prisma.zoomAccount.update({
        where: { id: zoomAccount.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          zoomUserId, // update if needed
          email: zoomEmail,
        },
      });
    } else {
      // Create new with YOUR app's userId
      zoomAccount = await prisma.zoomAccount.create({
        data: {
          userId: currentUserId, // ← এটা ঠিক করা হয়েছে
          zoomUserId,
          email: zoomEmail,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
        },
      });
    }

    return zoomAccount;
  } catch (error: any) {
    console.error('Zoom OAuth Error Details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      headers: error.response?.headers,
    });
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Zoom OAuth failed!',
      error.response?.data,
    );
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

const getAllFromDB = async (
  params: IZoomFilterRequest,
  options: IPaginationOptions,
  userId: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const andConditions: Prisma.ZoomMeetingWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: zoomSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // Filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  andConditions.push({
    zoomAccount: {
      userId: userId,
    },
  });

  const whereConditions: Prisma.ZoomMeetingWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.zoomMeeting.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: 'desc',
          },
    include: {
      meetingAssignment: true,
    },
  });

  const total = await prisma.zoomMeeting.count({
    where: whereConditions,
  });

  const formattedResult = result.map(meeting => ({
    ...meeting,
    isAssignMeeting: meeting.meetingAssignment.length > 0,
  }));

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: formattedResult,
  };
};

const getByIdFromDB = async (id: string): Promise<ZoomMeeting | null> => {
  const result = await prisma.zoomMeeting.findUnique({
    where: { id, isDeleted: false },
    include: {
      zoomAccount: {
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
        },
      },
      meetingAssignment: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Meeting not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IZoomMeeting>,
): Promise<ZoomMeeting> => {
  const meeting = await prisma.zoomMeeting.findUnique({
    where: { id },
  });
  if (!meeting || meeting?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found!');
  }

  const result = await prisma.zoomMeeting.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<ZoomMeeting> => {
  const meeting = await prisma.zoomMeeting.findUnique({
    where: { id },
  });
  if (!meeting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found!');
  }

  const result = await prisma.zoomMeeting.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not deleted!');
  }

  return result;
};

export const ZoomService = {
  handleOAuthCallback,
  refreshAccessToken,
  createMeeting,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
