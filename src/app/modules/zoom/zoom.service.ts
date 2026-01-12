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
const handleOAuthCallback = async (
  code: string,
  currentUserId: string | null | undefined,
  state?: string, 
): Promise<any> => {
  console.log('🚀 Zoom OAuth Callback Started');
  console.log('Code received:', code);
  console.log('State received (if any):', state);
  console.log('Current App User ID (from session/query):', currentUserId);

  // Step 1: userId নিশ্চিত করুন
  let userId = currentUserId;

  // যদি state থেকে userId পাওয়া যায় (অত্যন্ত নিরাপদ)
  if (state) {
    try {
      // state হলো base64 encoded বা সাধারণ string হতে পারে
      userId = Buffer.from(state, 'base64').toString('utf-8');
      console.log('User ID recovered from state:', userId);
    } catch (err) {
      console.error('Invalid state parameter:', err);
    }
  }

  // যদি এখনও userId না পাওয়া যায় → এরর
  if (!userId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User ID is missing. Please login again and try connecting Zoom.',
    );
  }

  try {
    // Step 2: Exchange code for tokens
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
    console.log('Zoom tokens received successfully');

    // Step 3: Get Zoom user information
    const userInfoResponse = await axios.get('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const zoomUserId = userInfoResponse.data.id;
    const zoomEmail = userInfoResponse.data.email;
    console.log('Zoom user info:', { zoomUserId, zoomEmail });

    // Step 4: Check if user exists in your database
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      console.error(`User not found in database with ID: ${userId}`);
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Your account not found in our system. Please register/login first.',
      );
    }

    // Step 5: Check if Zoom account already connected for this user
    let zoomAccount = await prisma.zoomAccount.findFirst({
      where: { userId },
    });

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    if (zoomAccount) {
      // Update existing account
      console.log('Updating existing Zoom account');
      zoomAccount = await prisma.zoomAccount.update({
        where: { id: zoomAccount.id },
        data: {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
          zoomUserId,
          email: zoomEmail,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new Zoom account
      console.log('Creating new Zoom account');
      zoomAccount = await prisma.zoomAccount.create({
        data: {
          userId,
          zoomUserId,
          email: zoomEmail,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt,
        },
      });
    }

    console.log('Zoom account connected successfully:', zoomAccount.id);
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
      'Failed to connect Zoom account. Please try again.',
      error.response?.data || error.message,
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
          Authorization: `Basic ${Buffer.from(`${config.zoom.client_id}:${config.zoom.client_secret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    const updated = await prisma.zoomAccount.update({
      where: { id: account.id },
      data: {
        accessToken: refreshResponse.data.access_token,
        refreshToken:
          refreshResponse.data.refresh_token || account.refreshToken,
        expiresAt: new Date(
          Date.now() + refreshResponse.data.expires_in * 1000,
        ),
      },
    });

    return updated;
  } catch (error: any) {
    console.error('Refresh token failed:', error.response?.data);
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      'Zoom token refresh failed. Please reconnect Zoom account.',
    );
  }
};

// Create Meeting
const createMeeting = async (payload: IZoomMeeting) => {
  const { userId, topic, startTime, duration, agenda, timezone } = payload;

  // ১. Zoom account
  let account = await prisma.zoomAccount.findFirst({ where: { userId } });
  if (!account) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom account not found');
  }

  // ২. Access token expire
  const now = new Date();
  if (account.expiresAt < now) {
    console.log(`Access token expired for user: ${userId} - Refreshing...`);
    account = await refreshAccessToken(userId);
  }

  // ৩. API
  const headers = { Authorization: `Bearer ${account.accessToken}` };

  try {
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
      { headers },
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
        endTime: new Date(
          new Date(m.start_time).getTime() + m.duration * 60000,
        ),
        timezone: m.timezone,
      },
    });
  } catch (error: any) {
    // ৪. If 401 Unauthorized
    if (error.response?.status === 401) {
      console.log(
        '401 error during create meeting - refreshing token and retrying...',
      );

      // Token refresh
      account = await refreshAccessToken(userId);

      // try again create meeting
      const retryResponse = await axios.post(
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

      const m = retryResponse.data;

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
          endTime: new Date(
            new Date(m.start_time).getTime() + m.duration * 60000,
          ),
          timezone: m.timezone,
        },
      });
    }

    // If others error found
    console.error(
      'Zoom meeting creation failed:',
      error.response?.data || error.message,
    );
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create Zoom meeting',
      error.response?.data,
    );
  }
};

const getAllFromDB = async (
  params: IZoomFilterRequest,
  options: IPaginationOptions,
  userId: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, status, ...filterData } = params;

  const user = await prisma.user.findUnique({
    where: { id: userId, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const andConditions: Prisma.ZoomMeetingWhereInput[] = [];

  // Search
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

  // Status filter (incoming / expired)
  if (status) {
    const now = new Date();
    if (status === 'incoming') {
      andConditions.push({
        startTime: { gt: now },
      });
    } else if (status === 'expired') {
      andConditions.push({
        startTime: { lte: now },
      });
    }
  }

  // Other filters (topic, duration ইত্যাদি)
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  // Only own meetings
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
        ? { [options.sortBy]: options.sortOrder }
        : { startTime: 'asc' }, // default sort by upcoming first
    include: {
      meetingAssignment: {
        include: {
          course: {
            select: {
              title: true,
              thumbnail: true,
              description: true,
            },
          },
          event: {
            select: {
              title: true,
              thumbnail: true,
              description: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
              photoUrl: true,
              contactNo: true,
            },
          },
          zoomMeeting: true,
        },
      },
    },
  });

  const total = await prisma.zoomMeeting.count({
    where: whereConditions,
  });

  // Add isAssignMeeting & status
  const formattedResult = result.map(meeting => {
    const now = new Date();
    const start = new Date(meeting.startTime);

    return {
      ...meeting,
      isAssignMeeting: meeting.meetingAssignment.length > 0,
      status: start > now ? 'incoming' : 'expired',
    };
  });

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
      meetingAssignment: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              photoUrl: true,
            },
          },
          zoomMeeting: true,
          course: true,
          event: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Meeting not found!');
  }

  const now = new Date();
  const start = new Date(result.startTime);

  const formattedResult = {
    ...result,
    isAssignMeeting: result.meetingAssignment.length > 0,
    status: start > now ? 'incoming' : 'expired',
  };

  return formattedResult;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IZoomMeeting>,
): Promise<ZoomMeeting> => {
  const meeting = await prisma.zoomMeeting.findUnique({
    where: { id, isDeleted: false },
  });
  if (!meeting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting not found!');
  }

  let newEndTime: Date | undefined;

  if (payload.startTime || payload.duration) {
    // current start time and duration
    const baseStartTime = payload.startTime
      ? new Date(payload.startTime)
      : meeting.startTime;
    const baseDuration =
      payload.duration !== undefined ? payload.duration : meeting.duration;

    // New endTime = startTime + duration minutes
    newEndTime = new Date(baseStartTime.getTime() + baseDuration * 60 * 1000);
  }

  // Update payload
  const updateData: Prisma.ZoomMeetingUpdateInput = {
    ...payload,
    ...(newEndTime && { endTime: newEndTime }),
  };

  const result = await prisma.zoomMeeting.update({
    where: { id },
    data: updateData,
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
