import {
  Coupon,
  Event,
  Prisma,
  Review,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IReview, IReviewFilterRequest } from './review.interface';
import { reviewSearchAbleFields } from './review.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IReview) => {
  const result = await prisma.review.create({
    data: payload
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Review creation failed!',
    );
  }

  return result;
};

const getAllFromDB = async (
  params: IReviewFilterRequest,
  options: IPaginationOptions,
  reference?: string
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ReviewWhereInput[] = [];

  // Search across Package and nested User fields
  if (searchTerm) {
      andConditions.push({
        OR: reviewSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.ReviewWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.review.findMany({
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

  const total = await prisma.review.count({
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

const getByIdFromDB = async (id: string): Promise<Review | null> => {
  const result = await prisma.review.findUnique({
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
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Review not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IReview>
): Promise<Review> => {
  const review = await prisma.review.findUnique({
    where: { id },
  });
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found!');
  }

  const result = await prisma.review.update({
    where: { id },
    data: payload
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Review> => {
  const event = await prisma.review.findUniqueOrThrow({
    where: { id },
  });
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found!');
  }

  const result = await prisma.review.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not deleted!');
  }

  return result;
};

export const ReviewService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
