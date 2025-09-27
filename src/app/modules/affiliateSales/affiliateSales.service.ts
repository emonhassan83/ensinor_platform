import { AffiliateSale, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IAffiliateSale,
  IAffiliateSaleFilterRequest,
} from './affiliateSales.interface';
import { affiliateSaleSearchAbleFields } from './affiliateSales.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IAffiliateSale) => {
  const { affiliateId, orderId } = payload;

  // 1️. Fetch the affiliate
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
  });
  if (!affiliate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate not found!');
  }

  // 2️. Fetch the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });
  if (!order || order.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Order not found!');
  }

  // 3️. Prevent duplicate affiliate sale for same order
  const existingSale = await prisma.affiliateSale.findUnique({
    where: { orderId , affiliateId },
  });
  if (existingSale) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Affiliate sale already created for this order!'
    );
  }

  // 4️. Calculate commission
  const commissionRate = 0.2; // 20%
  const commission = order.finalAmount * commissionRate;

  // 5️. Create the affiliate sale
  const result = await prisma.affiliateSale.create({
    data: {
      ...payload,
      commission,
      authorId: affiliate.userId,
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Affiliate sale creation failed!',
    );
  }

  // 6️. Update affiliate total earnings & pending amount
  await prisma.affiliate.update({
    where: { id: affiliateId },
    data: {
      totalEarnings: { increment: commission },
      pendingAmount: { increment: commission },
      totalSales: { increment: 1 },
    },
  });

  return result;
};

const getAllFromDB = async (
  params: IAffiliateSaleFilterRequest,
  options: IPaginationOptions,
  filterBy: { orderId?: string; authorId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.AffiliateSaleWhereInput[] = [];
  // Filter either by orderId or userId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.orderId) {
    andConditions.push({ orderId: filterBy.orderId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: affiliateSaleSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.AffiliateSaleWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.affiliateSale.findMany({
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
      affiliate: {
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
      },
      order: true,
    },
  });

  const total = await prisma.affiliateSale.count({
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

const getByIdFromDB = async (id: string): Promise<AffiliateSale | null> => {
  const result = await prisma.affiliateSale.findUnique({
    where: { id },
    include: {
      affiliate: {
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
      },
      order: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Affiliate sale not found!');
  }
  return result;
};

const deleteFromDB = async (id: string): Promise<AffiliateSale> => {
  const affiliateSale = await prisma.affiliateSale.findUnique({
    where: { id },
  });
  if (!affiliateSale) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate sale not found!');
  }

  const result = await prisma.affiliateSale.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate sale not deleted!');
  }

  return result;
};

export const AffiliateSaleService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  deleteFromDB,
};
