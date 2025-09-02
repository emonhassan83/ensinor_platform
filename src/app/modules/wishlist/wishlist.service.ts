import {
  Prisma,
  Wishlist,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IWishlist, IWishlistFilterRequest } from './wishlist.interface';
import { wishlistSearchAbleFields } from './wishlist.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IWishlist) => {
  const result = await prisma.wishlist.create({
    data: payload
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Wishlist creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: IWishlistFilterRequest,
  options: IPaginationOptions,
  reference?: string
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.WishlistWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
      andConditions.push({
        OR: wishlistSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.WishlistWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.wishlist.findMany({
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

  const total = await prisma.wishlist.count({
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

const getByIdFromDB = async (id: string): Promise<Wishlist | null> => {
  const result = await prisma.wishlist.findUnique({
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
      // reference: true
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Wishlist not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IWishlist>
): Promise<Wishlist> => {
  const wishlist = await prisma.wishlist.findUnique({
    where: { id },
  });
  if (!wishlist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not found!');
  }

  const result = await prisma.wishlist.update({
    where: { id },
    data: payload
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Wishlist> => {
  const wishlist = await prisma.wishlist.findUniqueOrThrow({
    where: { id },
  });
  if (!wishlist) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not found!');
  }

  const result = await prisma.wishlist.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Wishlist not deleted!');
  }

  return result;
};

export const WishlistService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
