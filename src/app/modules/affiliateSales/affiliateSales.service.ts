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

const insertIntoDB = async (payload: IAffiliateSale) => {
  const result = await prisma.affiliateSale.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Affiliate sale creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: IAffiliateSaleFilterRequest,
  options: IPaginationOptions,
  reference?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.AffiliateSaleWhereInput[] = [];

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
      course: true
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Affiliate sale not found!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<AffiliateSale> => {
  const affiliateSale = await prisma.affiliateSale.findUniqueOrThrow({
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
