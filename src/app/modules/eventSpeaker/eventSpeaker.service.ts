import { EventSpeaker, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IEventSpeaker,
  IEventSpeakerFilterRequest,
} from './eventSpeaker.interface';
import { eventSpeakerSearchAbleFields } from './eventSpeaker.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

const insertIntoDB = async (payload: IEventSpeaker, file: any) => {
  // upload to image
  if (file) {
    payload.photo = (await uploadToS3({
      file,
      fileName: `images/event-speaker/photo/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.eventSpeaker.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Event speaker creation failed!',
    );
  }
  return result;
};

const getAllFromDB = async (
  params: IEventSpeakerFilterRequest,
  options: IPaginationOptions,
  eventId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EventSpeakerWhereInput[] = [{ eventId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: eventSpeakerSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.EventSpeakerWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.eventSpeaker.findMany({
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

  const total = await prisma.eventSpeaker.count({
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

const getByIdFromDB = async (id: string): Promise<EventSpeaker | null> => {
  const result = await prisma.eventSpeaker.findUnique({
    where: { id },
    include: {
      event: true,
      schedule: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Event speaker not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEventSpeaker>,
  file: any,
): Promise<EventSpeaker> => {
  const speaker = await prisma.eventSpeaker.findUnique({
    where: { id },
  });
  if (!speaker) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event speaker not found!');
  }

  // upload to image
  if (file) {
    payload.photo = (await uploadToS3({
      file,
      fileName: `images/event-speaker/photo/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.eventSpeaker.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event speaker not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<EventSpeaker> => {
  const speaker = await prisma.eventSpeaker.findUniqueOrThrow({
    where: { id },
  });
  if (!speaker) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event speaker not found!');
  }

  const result = await prisma.eventSpeaker.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event speaker not deleted!');
  }

  return result;
};

export const EventSpeakerService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
