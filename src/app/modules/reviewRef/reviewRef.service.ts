import {
  Coupon,
  Event,
  Prisma,
  Review,
  ReviewRef,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IReviewRef, IReviewRefFilterRequest } from './reviewRef.interface';
import { reviewRefSearchAbleFields } from './reviewRef.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IReviewRef) => {
  const { userId, reviewId } = payload;
  const review = await prisma.review.findFirst({
    where: {
      id: reviewId,
      isDeleted: false,
    },
  });
  if (!review) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Review not found!');
  }

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
      status: UserStatus.active,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Review ref not found!');
  }

  const result = await prisma.reviewRef.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Review ref creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IReviewRefFilterRequest,
  options: IPaginationOptions,
  reviewId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ReviewRefWhereInput[] = [];
  if (reviewId) {
    andConditions.push({ reviewId });
  }

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: reviewRefSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.ReviewRefWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.reviewRef.findMany({
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

  const total = await prisma.reviewRef.count({
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

const getByIdFromDB = async (id: string): Promise<ReviewRef | null> => {
  const result = await prisma.reviewRef.findUnique({
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
      review: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Review ref not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IReviewRef>,
): Promise<ReviewRef> => {
  const reviewRef = await prisma.reviewRef.findUnique({
    where: { id },
  });
  if (!reviewRef) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review ref not found!');
  }

  const result = await prisma.reviewRef.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review ref not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<ReviewRef> => {
  const reviewRef = await prisma.reviewRef.findUniqueOrThrow({
    where: { id },
  });
  if (!reviewRef) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review ref not found!');
  }

  const result = await prisma.reviewRef.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review ref not deleted!');
  }

  return result;
};

export const ReviewRefService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
