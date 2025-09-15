import httpStatus from 'http-status';
import {
  Assignment,
  Batch,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IAssignment, IAssignmentFilterRequest } from './assignment.interface';
import { assignmentSearchAbleFields } from './assignment.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

const insertIntoDB = async (payload: IAssignment, file: any) => {
  const { authorId, courseId } = payload;
  const author = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found!');
  }

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      instructorId: authorId,
      isDeleted: false,
    },
  });
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  // upload to image
  if (file) {
    payload.fileUrl = (await uploadToS3({
      file,
      fileName: `images/assignment/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.assignment.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Assignment creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IAssignmentFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; courseId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.AssignmentWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.courseId) {
    andConditions.push({ courseId: filterBy.courseId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: assignmentSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.AssignmentWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.assignment.findMany({
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
      course: {
        select: {
          title: true,
          thumbnail: true,
        },
      },
    },
  });

  const total = await prisma.assignment.count({
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

const getByIdFromDB = async (id: string): Promise<Assignment | null> => {
  const result = await prisma.assignment.findUnique({
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
      course: {
        select: {
          title: true,
          thumbnail: true,
        },
      },
      submissions: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Assignment not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IAssignment>,
  file: any,
): Promise<Assignment> => {
  const assignment = await prisma.assignment.findUnique({
    where: { id, isDeleted: false },
  });
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found!');
  }

  // upload to image
  if (file) {
    payload.fileUrl = (await uploadToS3({
      file,
      fileName: `images/assignment/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.assignment.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Batch> => {
  const assignment = await prisma.assignment.findUnique({
    where: { id, isDeleted: false },
  });
  if (!assignment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not found!');
  }

  const result = await prisma.batch.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Assignment not deleted!');
  }

  return result;
};

export const AssignmentService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
