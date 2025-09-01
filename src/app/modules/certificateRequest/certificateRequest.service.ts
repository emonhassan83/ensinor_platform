import {
  CertificateRequest,
  EnrolledCourse,
  Prisma,
  Quiz,
  QuizAttempt,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICertificateRequest,
  ICertificateRequestFilterRequest,
} from './certificateRequest.interface';
import { certificateRequestSearchAbleFields } from './certificateRequest.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: ICertificateRequest) => {
  const { authorId, courseId } = payload;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
    },
  });
  if (!course || course?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Courses not found!');
  }

  const user = await prisma.user.findFirst({
    where: {
      id: authorId,
    },
  });
  if (!user || user?.isDeleted) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Certificate request user not found!',
    );
  }

  const result = await prisma.certificateRequest.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Certificate request creation failed!',
    );
  }
  return result;
};

const getAllFromDB = async (
  params: ICertificateRequestFilterRequest,
  options: IPaginationOptions,
  authorId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CertificateRequestWhereInput[] = [{ authorId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: certificateRequestSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CertificateRequestWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.certificateRequest.findMany({
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
      author: true,
      course: true,
    },
  });

  const total = await prisma.certificateRequest.count({
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

const getByIdFromDB = async (
  id: string,
): Promise<CertificateRequest | null> => {
  const result = await prisma.certificateRequest.findUnique({
    where: { id },
    include: {
      author: true,
      course: true,
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Oops! Certificate request not found!',
    );
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICertificateRequest>,
): Promise<CertificateRequest> => {
  const certificateRequest = await prisma.certificateRequest.findUnique({
    where: { id },
  });
  if (!certificateRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate request not found!');
  }

  const result = await prisma.certificateRequest.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Certificate request not updated!',
    );
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<CertificateRequest> => {
  const certificateRequest = await prisma.certificateRequest.findUniqueOrThrow({
    where: { id },
  });
  if (!certificateRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate request not found!');
  }

  const result = await prisma.certificateRequest.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Certificate request not deleted!',
    );
  }

  return result;
};

export const CertificateRequestService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
