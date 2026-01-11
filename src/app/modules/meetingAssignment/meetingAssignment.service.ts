import { MeetingAssignment, Prisma, UserRole, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IMeetingAssign,
  IMeetingAssignFilterRequest,
} from './meetingAssignment.interface';
import { meetingAssignmentSearchAbleFields } from './meetingAssignment.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { sendMeetingAssignmentEmail, sendMeetingAssignmentNotification } from './meetingAssignment.utils';

const insertIntoDB = async (payload: IMeetingAssign) => {
  const { authorId, modelType, zoomMeetingId, courseId, eventId, userId } = payload;

  // ১. Author validation (active + instructor/admin)
  const author = await prisma.user.findUnique({
    where: { id: authorId, status: UserStatus.active, isDeleted: false },
    select: { role: true, name: true },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');
  }

  // ২. Zoom Meeting validation (exist + own)
  const meeting = await prisma.zoomMeeting.findUnique({
    where: { id: zoomMeetingId },
    include: { zoomAccount: { select: { userId: true } } },
  });
  if (!meeting) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Zoom meeting not found!');
  }
  if (meeting.zoomAccount.userId !== authorId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You can only assign your own Zoom meetings!');
  }

  // ৩. ModelType wise validation + invalid target
  if (modelType === 'course') {
    if (!courseId) throw new ApiError(httpStatus.BAD_REQUEST, 'Course ID is required for course assignment!');
    if (eventId || userId) throw new ApiError(httpStatus.BAD_REQUEST, 'For course assignment, only courseId should be provided!');
    
    // Course exist
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or not found course!');
  } else if (modelType === 'event') {
    if (!eventId) throw new ApiError(httpStatus.BAD_REQUEST, 'Event ID is required for event assignment!');
    if (courseId || userId) throw new ApiError(httpStatus.BAD_REQUEST, 'For event assignment, only eventId should be provided!');
    
    // Event exist
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or not found event!');
  } else if (modelType === 'user') {
    if (!userId) throw new ApiError(httpStatus.BAD_REQUEST, 'User ID is required for user assignment!');
    if (courseId || eventId) throw new ApiError(httpStatus.BAD_REQUEST, 'For user assignment, only userId should be provided!');
    
    // User exist + active
    const targetUser = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
    });
    if (!targetUser) throw new ApiError(httpStatus.NOT_FOUND, 'Invalid or not found user!');
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid modelType!');
  }

  // ৪. Duplicate assignment
  const existing = await prisma.meetingAssignment.findFirst({
    where: {
      zoomMeetingId,
      courseId: courseId || null,
      eventId: eventId || null,
      userId: userId || null,
    },
  });
  if (existing) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'This meeting is already assigned to this target!');
  }

  // ৫. Create assignment
  const result = await prisma.meetingAssignment.create({
    data: payload,
    include: {
      zoomMeeting: true,
      course: true,
      event: true,
      user: true,
      author: true,
    },
  });

  // ৬. Recipients
  let recipients: { id: string; email: string; name?: string }[] = [];

  if (modelType === 'course' && courseId) {
    const enrolled = await prisma.enrolledCourse.findMany({
      where: { courseId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    recipients = enrolled.map(e => e.user);
  } else if (modelType === 'event' && eventId) {
    const bookings = await prisma.eventBooking.findMany({
      where: { eventId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    recipients = bookings.map(b => b.user);
  } else if (modelType === 'user' && userId) {
    const single = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (single) recipients = [single];
  }

  // ৭. Notification + Email
  if (recipients.length > 0) {
    const meetingDetails = {
      topic: result.zoomMeeting.topic,
      agenda: result.zoomMeeting.agenda,
      joinUrl: result.zoomMeeting.joinUrl,
      password: result.zoomMeeting.password,
      startTime: result.zoomMeeting.startTime,
      duration: result.zoomMeeting.duration,
      timezone: result.zoomMeeting.timezone,
    };

    // reusable notification utils
    await sendMeetingAssignmentNotification(recipients, meetingDetails, modelType);

    // Email sent
    const emailPromises = recipients.map(rec =>
      sendMeetingAssignmentEmail(rec.email, rec.name, meetingDetails, modelType)
    );
    
    Promise.allSettled(emailPromises).catch(err =>
      console.error('Meeting email failed:', err)
    );
  }

  return result;
};

const getAllFromDB = async (
  params: IMeetingAssignFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.MeetingAssignmentWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: meetingAssignmentSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.MeetingAssignmentWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.meetingAssignment.findMany({
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
  });

  const total = await prisma.meetingAssignment.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getByIdFromDB = async (id: string): Promise<MeetingAssignment | null> => {
  const result = await prisma.meetingAssignment.findUnique({
    where: { id },
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
  });

  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Oops! Meeting Assignment not found!',
    );
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IMeetingAssign>,
): Promise<MeetingAssignment> => {
  const meetingAssignment = await prisma.meetingAssignment.findUnique({
    where: { id },
  });
  if (!meetingAssignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting Assignment not found!');
  }

  const result = await prisma.meetingAssignment.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting Assignment not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<MeetingAssignment> => {
  const meetingAssignment = await prisma.meetingAssignment.findUnique({
    where: { id },
  });
  if (!meetingAssignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting Assignment not found!');
  }

  const result = await prisma.meetingAssignment.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Meeting Assignment not deleted!');
  }

  return result;
};

export const MeetingAssignmentService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
