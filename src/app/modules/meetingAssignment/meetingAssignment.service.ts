import { MeetingAssignment, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IMeetingAssign,
  IMeetingAssignFilterRequest,
} from './meetingAssignment.interface';
import { meetingAssignmentSearchAbleFields } from './meetingAssignment.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IMeetingAssign) => {
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

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Meeting assign failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: IMeetingAssignFilterRequest,
  options: IPaginationOptions,
  reference?: string,
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Meeting Assignment not found!');
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
