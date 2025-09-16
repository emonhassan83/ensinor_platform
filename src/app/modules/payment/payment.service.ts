import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import { IPayment, IPaymentFilterRequest } from './payment.interface';
import { IPaginationOptions } from '../../interfaces/pagination';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { Payment, Prisma } from '@prisma/client';
import { paymentSearchAbleFields } from './payment.constants';
import prisma from '../../utils/prisma';

const getAllIntoDB = async (
  params: IPaymentFilterRequest,
  options: IPaginationOptions,
  filterBy?: { authorId?: string; userId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.PaymentWhereInput[] = [{ isDeleted: false }];

  // Filter either by authorId or userId
  if (filterBy && filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy && filterBy.userId) {
    andConditions.push({ userId: filterBy.userId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: paymentSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.PaymentWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.payment.findMany({
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
      account: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  const total = await prisma.payment.count({
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

const getByIdIntoDB = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id, isDeleted: false },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
      order: true,
      subscription: true,
    },
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }
  return payment;
};

const updateIntoDB = async (id: string, payload: Partial<Payment>) => {
  const payment = await prisma.payment.findUnique({
    where: { id, isDeleted: false },
  });
  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Payment not found');
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: payload,
    include: {
      account: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!updated) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment updating failed');
  }
  return updated;
};

const deleteIntoDB = async (id: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id, isDeleted: false },
  });
  if (!payment) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment already deleted!');
  }

  const result = await prisma.payment.update({
    where: { id },
    data: {
      isDeleted: true,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNo: true,
          photoUrl: true,
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Payment deleting failed');
  }
  return result;
};

export const PaymentService = {
  getAllIntoDB,
  getByIdIntoDB,
  updateIntoDB,
  deleteIntoDB,
};
