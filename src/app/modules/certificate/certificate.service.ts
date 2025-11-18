import { Certificate, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICertificate,
  ICertificateFilterRequest,
} from './certificate.interface';
import { certificateSearchAbleFields } from './certificate.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: ICertificate) => {
  const { userId, enrolledCourseId } = payload;

  // 1. Fetch user (student)
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
      status: UserStatus.active,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Student not found!');
  }

  // 2. Validate enrollment
  const enrollment = await prisma.enrolledCourse.findFirst({
    where: { id: enrolledCourseId, userId, isDeleted: false },
    include: { course: true },
  });
  if (!enrollment) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User is not enrolled in this course!',
    );
  }

  // 3. Check if course is completed
  if (!enrollment.isComplete) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot create certificate. Course is not completed!',
    );
  }

  // 4. Check for existing certificate (prevent duplicate)
  const existingCertificate = await prisma.certificate.findFirst({
    where: { userId, enrolledCourseId },
  });
  if (existingCertificate) return existingCertificate;

  // 5. Auto-assign authorId from course instructorId
  payload.authorId = enrollment.course.authorId;

  // 6. Create certificate
  const result = await prisma.certificate.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Certificate creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: ICertificateFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; userId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CertificateWhereInput[] = [];

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
      OR: certificateSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CertificateWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.certificate.findMany({
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
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  const total = await prisma.certificate.count({
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

const getByIdFromDB = async (id: string): Promise<Certificate | null> => {
  const result = await prisma.certificate.findUnique({
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
      course: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Certificate not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICertificate>
): Promise<Certificate> => {
  const certificate = await prisma.certificate.findUnique({
    where: { id },
  });
  if (!certificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not found!');
  }

  const result = await prisma.certificate.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Certificate> => {
  const certificate = await prisma.certificate.findUniqueOrThrow({
    where: { id },
  });
  if (!certificate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not found!');
  }

  const result = await prisma.certificate.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate not deleted!');
  }

  return result;
};

export const CertificateService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
