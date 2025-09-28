import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';
import prisma from '../../utils/prisma';
import { IPaginationOptions } from '../../interfaces/pagination';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { cartSearchableFields } from './cart.constant';
import { ICart, ICartFilterRequest } from './cart.interface';

const insertIntoDB = async (payload: ICart) => {
  const { userId } = payload;

  const author = await prisma.user.findFirst({
    where: {
      id: userId,
      role: UserRole.super_admin,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  const result = await prisma.cart.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Article creation failed!');
  }

  return result;
};

const getAllFromDB = async (
  filters: ICartFilterRequest,
  options: IPaginationOptions,
  userId: string,
) => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions: Prisma.CartWhereInput[] = [];
  if (userId) {
    andConditions.push({ userId });
  }

  if (searchTerm) {
    andConditions.push({
      OR: cartSearchableFields.map(field => ({
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

  const whereConditions: Prisma.CartWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.cart.findMany({
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
      user: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
        },
      },
    },
  });
  const total = await prisma.cart.count({
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

const getAllCategoriesFromDB = async () => {
  const andConditions: Prisma.ArticleWhereInput[] = [{ isDeleted: false }];

  const whereConditions: Prisma.ArticleWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  return await prisma.article.findMany({
    where: whereConditions,
    distinct: ['category'],
    orderBy: {
      category: 'asc', // ✅ sort alphabetically by category
    },
    select: {
      id: true,
      category: true,
    },
  });
};

const getByIdFromDB = async (id: string) => {
  const result = await prisma.article.findUnique({
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

  if (!result || result.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Article not found');
  }

  return result;
};

const deleteFromDB = async (id: string) => {
  const article = await prisma.article.findUnique({
    where: { id },
  });
  if (!article || article?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Article not found!');
  }

  const result = await prisma.article.update({
    where: { id },
    data: { isDeleted: true },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Article deletion failed');
  }

  return result;
};

export const CartServices = {
  insertIntoDB,
  getAllFromDB,
  getAllCategoriesFromDB,
  getByIdFromDB,
  deleteFromDB,
};
