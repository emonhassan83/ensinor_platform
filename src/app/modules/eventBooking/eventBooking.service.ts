import { Book, Course, Event, EventBooking, Package, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IEventBooking,
  IEventBookingFilterRequest,
} from './eventBooking.interface';
import { eventBookingSearchAbleFields } from './eventBooking.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

const insertIntoDB = async (payload: IEventBooking) => {
  const { eventId, userId } = payload;

  const event = await prisma.event.findFirst({
    where: {id: eventId}
  })
  if (!event || event?.isDeleted) {
     throw new ApiError(httpStatus.NOT_FOUND, 'Event not found!'); 
  }

  const user = await prisma.user.findFirst({
    where: {id: userId}
  })
  if (!user || event?.isDeleted) {
     throw new ApiError(httpStatus.NOT_FOUND, 'User not found!'); 
  }

  const result = await prisma.eventBooking.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Event booking creation failed!',
    );
  }
  return result;
};

const getAllFromDB = async (
  params: IEventBookingFilterRequest,
  options: IPaginationOptions,
  userId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EventBookingWhereInput[] = [
    { userId, isDeleted: false },
  ];

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
    where: { id },
    include: {
      user: {
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

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Event booking not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEventBooking>
): Promise<EventBooking> => {
  const event = await prisma.eventBooking.findUnique({
    where: { id },
  });
  if (!event || event?.isDeleted) {
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
    where: { id },
  });
  if (!event || event?.isDeleted) {
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
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
