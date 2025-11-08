import { EventBooking, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IEventBooking,
  IEventBookingFilterRequest,
  IEventsBooking,
} from './eventBooking.interface';
import { eventBookingSearchAbleFields } from './eventBooking.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IEventBooking) => {
  const { eventId, userId } = payload;

  const event = await prisma.event.findFirst({
    where: { id: eventId, isDeleted: false },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found!');
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Check if user already booked the same event at the same time
  const existingBooking = await prisma.eventBooking.findFirst({
    where: {
      eventId,
      userId,
      isDeleted: false,
    },
  });

  if (existingBooking) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'You have already booked this event at this time!',
    );
  }

  const result = await prisma.eventBooking.create({
    data: {
      ...payload,
      ...(event.authorId ? { authorId: event.authorId } : {}),
      amount: event.price,
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Event booking creation failed!',
    );
  }

  // event registered increment by one
  await prisma.event.update({
    where: { id: event.id },
    data: {
      registered: { increment: 1 },
    },
  });

  return result;
};

const bulkInsertIntoDB = async (payload: IEventsBooking) => {
  const { eventIds, userId, name, phone, email, organization, profession, city, country, document } = payload;

  if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No events provided for booking!');
  }

  // ✅ Validate user
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // ✅ Fetch all valid events
  const events = await prisma.event.findMany({
    where: {
      id: { in: eventIds },
      isDeleted: false,
    },
  });

  if (!events.length) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No valid events found!');
  }

  // ✅ Filter out events the user has already booked
  const existingBookings = await prisma.eventBooking.findMany({
    where: {
      userId,
      eventId: { in: eventIds },
      isDeleted: false,
    },
    select: { eventId: true },
  });

  const alreadyBookedIds = existingBookings.map(b => b.eventId);
  const newEventIds = events
    .filter(e => !alreadyBookedIds.includes(e.id))
    .map(e => e.id);

  if (!newEventIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You already booked all selected events!');
  }

  // ✅ Prepare data for bulk insert
  const createData = events
    .filter(e => newEventIds.includes(e.id))
    .map(e => ({
      eventId: e.id,
      userId,
      authorId: e.authorId || userId,
      name,
      phone,
      email,
      organization,
      profession,
      city,
      country,
      amount: e.price,
      document,
    }));

  // ✅ Bulk create
  const result = await prisma.eventBooking.createMany({
    data: createData,
    skipDuplicates: true,
  });

  // ✅ Increment "registered" count for each event
  await Promise.all(
    newEventIds.map(eventId =>
      prisma.event.update({
        where: { id: eventId },
        data: { registered: { increment: 1 } },
      }),
    ),
  );

  return {
    result,
    existingBookings
  };
};

const getAllFromDB = async (
  params: IEventBookingFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; userId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EventBookingWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: eventBookingSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.EventBookingWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.eventBooking.findMany({
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
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          location: true,
          thumbnail: true,
          createdAt: true,
          registered: true,
        },
      },
    },
  });

  const total = await prisma.eventBooking.count({
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

const getByIdFromDB = async (id: string): Promise<EventBooking | null> => {
  const result = await prisma.eventBooking.findUnique({
    where: { id, isDeleted: false },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      event: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Event booking not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEventBooking>,
): Promise<EventBooking> => {
  const event = await prisma.eventBooking.findUnique({
    where: { id, isDeleted: false },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event booking not found!');
  }

  const result = await prisma.eventBooking.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event booking not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<EventBooking> => {
  const event = await prisma.eventBooking.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event booking not found!');
  }

  const result = await prisma.eventBooking.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event booking not deleted!');
  }

  return result;
};

export const EventBookingService = {
  insertIntoDB,
  bulkInsertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
