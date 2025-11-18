import { CertificateBuilder, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICertificateBuilder,
  ICertificateBuilderFilter,
} from './certificateBuilder.interface';
import { certificateBuilderSearchAbleFields } from './certificateBuilder.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: ICertificateBuilder) => {
  const { authorId } = payload;

  const user = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Certificate builder author not found!',
    );
  }

  // Check if a pending certificate request already exists
  const existingBuilder = await prisma.certificateBuilder.findFirst({
    where: {
      authorId,
    },
  });
  if (existingBuilder) return existingBuilder;

  // Create certificate request
  const result = await prisma.certificateBuilder.create({
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
  params: ICertificateBuilderFilter,
  options: IPaginationOptions,
  filterBy: { userId?: string; authorId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CertificateBuilderWhereInput[] = [];

  // Filter either by authorId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: certificateBuilderSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CertificateBuilderWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.certificateBuilder.findMany({
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
      author: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
        },
      },
    },
  });

  const total = await prisma.certificateBuilder.count({
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

const getByIdFromDB = async (id: string): Promise<any> => {
  const result = await prisma.certificateBuilder.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          role: true,
        },
      },
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
  payload: Partial<CertificateBuilder>,
): Promise<CertificateBuilder> => {
  const certificateBuilder = await prisma.certificateBuilder.findFirst({
    where: { id },
  });
  if (!certificateBuilder || certificateBuilder?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate builder not found!');
  }

  const result = await prisma.certificateBuilder.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Certificate builder not updated!',
    );
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<CertificateBuilder> => {
  const certificateBuilder = await prisma.certificateBuilder.findFirst({
    where: { id },
  });
  if (!certificateBuilder || certificateBuilder?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Certificate builder not found!');
  }

  const result = await prisma.certificateBuilder.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Certificate builder not deleted!',
    );
  }

  return result;
};

export const CertificateBuilderService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
