import { EventSchedule, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import httpStatus from 'http-status';
import {
  IEventSchedule,
  IEventScheduleFilterRequest,
} from './eventSchedule.interface';
import { eventScheduleSearchAbleFields } from './eventSchedule.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IEventSchedule) => {
  const { eventId } = payload;

  const event = await prisma.event.findFirst({
    where: { id: eventId },
  });
  if (!event || event?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Event not found!');
  }

  const result = await prisma.eventSchedule.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Event schedule creation failed!',
    );
  }
  return result;
};

const getAllFromDB = async (
  params: IEventScheduleFilterRequest,
  options: IPaginationOptions,
  eventId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EventScheduleWhereInput[] = [
    { eventId, isDeleted: false },
  ];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: eventScheduleSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.EventScheduleWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.eventSchedule.findMany({
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
      eventSpeaker: true,
    },
  });

  const total = await prisma.eventSchedule.count({
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

const getByIdFromDB = async (id: string): Promise<EventSchedule | null> => {
  const result = await prisma.eventSchedule.findUnique({
    where: { id },
    include: {
      eventSpeaker: true,
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Event schedule not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEventSchedule>,
): Promise<EventSchedule> => {
  const eventSchedule = await prisma.eventSchedule.findUnique({
    where: { id },
  });
  if (!eventSchedule || eventSchedule?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event schedule not found!');
  }

  const result = await prisma.eventSchedule.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event schedule not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<EventSchedule> => {
  const eventSchedule = await prisma.eventSchedule.findUniqueOrThrow({
    where: { id },
  });
  if (!eventSchedule || eventSchedule?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event schedule not found!');
  }

  const result = await prisma.eventSchedule.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event schedule not deleted!');
  }

  return result;
};

export const EventScheduleService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
