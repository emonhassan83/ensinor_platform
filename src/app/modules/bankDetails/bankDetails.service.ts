import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { bankDetailsSearchableFields } from './bankDetails.constant';
import {
  IBankDetails,
  IBankDetailsFilterRequest,
} from './bankDetails.interface';

const insertIntoDB = async (payload: IBankDetails) => {
  const { authorId } = payload;

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

  // Prevent multiple bank details for the same author
  const existingBank = await prisma.bankDetail.findUnique({
    where: { authorId, isDeleted: false },
  });
  if (existingBank) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'This author already has bank details.',
    );
  }

  const result = await prisma.bankDetail.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bank details creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: IBankDetailsFilterRequest,
  options: IPaginationOptions,
  authorId?: string,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.BankDetailWhereInput[] = [{ isDeleted: false }];
  if (authorId) {
    andConditions.push({ authorId });
  }

  if (searchTerm) {
    andConditions.push({
      OR: bankDetailsSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.BankDetailWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.bankDetail.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
    },
  });
  const total = await prisma.bankDetail.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const getByIdFromDB = async (id: string) => {
  const result = await prisma.bankDetail.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          dateOfBirth: true,
          contactNo: true,
          city: true,
          country: true,
          role: true,
          status: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Bank detail not found');
  }
  return result;
};

const updateIntoDB = async (id: string, payload: Partial<IBankDetails>) => {
  const bankDetail = await prisma.bankDetail.findUnique({
    where: { id, isDeleted: false },
  });
  if (!bankDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bank detail not found!');
  }

  const result = await prisma.bankDetail.update({
    where: { id },
    data: payload,
  });

  return result;
};

const deleteFromDB = async (id: string) => {
  const bankDetail = await prisma.bankDetail.findUnique({
    where: { id, isDeleted: false },
  });
  if (!bankDetail) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Bank detail not found!');
  }

  const result = await prisma.bankDetail.update({
    where: { id },
    data: { isDeleted: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bank detail deletion failed');
  }

  return result;
};

export const BankDetailsServices = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
