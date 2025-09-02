import {
  Coupon,
  Event,
  Prisma,
  Review,
  ReviewRef,
  WithdrawRequest,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IWithdrawRequest, IWithdrawRequestFilterRequest } from './withdrawRequest.interface';
import { withdrawRequestSearchAbleFields } from './withdrawRequest.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IWithdrawRequest) => {
  const result = await prisma.withdrawRequest.create({
    data: payload
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Withdraw request creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: IWithdrawRequestFilterRequest,
  options: IPaginationOptions,
  userId?: string
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.WithdrawRequestWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
      andConditions.push({
        OR: withdrawRequestSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.WithdrawRequestWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.withdrawRequest.findMany({
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

  const total = await prisma.withdrawRequest.count({
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

const getByIdFromDB = async (id: string): Promise<WithdrawRequest | null> => {
  const result = await prisma.withdrawRequest.findUnique({
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
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Withdraw request not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IWithdrawRequest>
): Promise<WithdrawRequest> => {
  const withdrawRequest = await prisma.withdrawRequest.findUnique({
    where: { id },
  });
  if (!withdrawRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Withdraw request not found!');
  }

  const result = await prisma.withdrawRequest.update({
    where: { id },
    data: payload
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Withdraw request not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<WithdrawRequest> => {
  const withdrawRequest = await prisma.withdrawRequest.findUniqueOrThrow({
    where: { id },
  });
  if (!withdrawRequest) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Withdraw request not found!');
  }

  const result = await prisma.withdrawRequest.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Withdraw request not deleted!');
  }

  return result;
};

export const WithdrawRequestService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
