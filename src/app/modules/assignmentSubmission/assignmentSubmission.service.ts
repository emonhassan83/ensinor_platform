import httpStatus from 'http-status';
import { Assignment, AssignmentSubmission, Batch, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IAssignmentSubmission,
  IAssignmentSubmissionFilterRequest,
} from './assignmentSubmission.interface';
import { assignmentSubmissionSearchAbleFields } from './assignmentSubmission.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

const insertIntoDB = async (payload: IAssignmentSubmission, file: any) => {
  const { assignmentId, userId } = payload;
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

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      isDeleted: false,
    },
  });
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  // assign author id
  assignment.authorId = payload.authorId;

  // upload to image
  if (file) {
    payload.fileUrl = (await uploadToS3({
      file,
      fileName: `images/assignment/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.assignmentSubmission.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment submission failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IAssignmentSubmissionFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; userId?: string; assignmentId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.AssignmentSubmissionWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }
  if (filterBy.assignmentId) {
    andConditions.push({ assignmentId: filterBy.assignmentId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: assignmentSubmissionSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.AssignmentSubmissionWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.assignmentSubmission.findMany({
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
      assignment: true,
    },
  });

  const total = await prisma.assignmentSubmission.count({
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

const getByIdFromDB = async (id: string): Promise<AssignmentSubmission | null> => {
  const result = await prisma.assignmentSubmission.findUnique({
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
      assignment: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Assignment submission not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IAssignmentSubmission>,
  file: any,
): Promise<AssignmentSubmission> => {
  const assignmentSubmission = await prisma.assignmentSubmission.findUnique({
    where: { id, isDeleted: false },
  });
  if (!assignmentSubmission) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment submission not found!');
  }

  // upload to image
  if (file) {
    payload.fileUrl = (await uploadToS3({
      file,
      fileName: `images/assignment/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.assignmentSubmission.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment submission not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<AssignmentSubmission> => {
  const assignmentSubmission = await prisma.assignmentSubmission.findUnique({
    where: { id, isDeleted: false },
  });
  if (!assignmentSubmission) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment submission not found!');
  }

  const result = await prisma.assignmentSubmission.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment submission not deleted!');
  }

  return result;
};

export const AssignmentSubmissionService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
