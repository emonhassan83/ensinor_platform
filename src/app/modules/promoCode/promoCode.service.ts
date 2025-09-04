import { Prisma, PromoCode } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IPromoCode, IPromoCodeFilterRequest } from './promoCode.interface';
import { promoCodeSearchAbleFields } from './promoCode.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IPromoCode) => {
  const result = await prisma.promoCode.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promo code creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  params: IPromoCodeFilterRequest,
  options: IPaginationOptions,
  reference?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.PromoCodeWhereInput[] = reference ? [{ course: { id: reference } }] : [];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: promoCodeSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.PromoCodeWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.promoCode.findMany({
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

  const total = await prisma.promoCode.count({
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

const getByIdFromDB = async (id: string): Promise<PromoCode | null> => {
  const result = await prisma.promoCode.findUnique({
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Promo code not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IPromoCode>,
): Promise<PromoCode> => {
  const promoCode = await prisma.promoCode.findUnique({
    where: { id },
  });
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not found!');
  }

  const result = await prisma.promoCode.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<PromoCode> => {
  const promoCode = await prisma.promoCode.findUniqueOrThrow({
    where: { id },
  });
  if (!promoCode) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not found!');
  }

  const result = await prisma.promoCode.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Promo code not deleted!');
  }

  return result;
};

export const PromoCodeService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
