import {
  Coupon,
  Event,
  Prisma,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICoupon, ICouponFilterRequest } from './coupon.interface';
import { couponSearchAbleFields } from './coupon.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: ICoupon) => {
  const result = await prisma.coupon.create({
    data: payload
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Coupon creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: ICouponFilterRequest,
  options: IPaginationOptions,
  reference?: string
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CouponWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
      andConditions.push({
        OR: couponSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CouponWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.coupon.findMany({
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

  const total = await prisma.coupon.count({
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

const getByIdFromDB = async (id: string): Promise<Coupon | null> => {
  const result = await prisma.coupon.findUnique({
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
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Coupon not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICoupon>
): Promise<Coupon> => {
  const event = await prisma.coupon.findUnique({
    where: { id },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  const result = await prisma.coupon.update({
    where: { id },
    data: payload
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Coupon> => {
  const event = await prisma.coupon.findUniqueOrThrow({
    where: { id },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not found!');
  }

  const result = await prisma.coupon.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Coupon not deleted!');
  }

  return result;
};

export const CouponService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
