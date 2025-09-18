import { Prisma, Review, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IReview, IReviewFilterRequest } from './review.interface';
import { reviewSearchAbleFields } from './review.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IReview) => {
  const { authorId, courseId, rating } = payload;

  // Step 1: Validate course
  const course = await prisma.course.findFirst({
    where: { id: courseId, isDeleted: false },
  });
  if (!course) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');
  }

  // Step 2: Validate user (review author)
  const user = await prisma.user.findFirst({
    where: { id: authorId, isDeleted: false, status: UserStatus.active },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Review user not found!');
  }

  // Step 3: Create Review
  const review = await prisma.review.create({
    data: payload,
  });
  if (!review) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Review creation failed!');
  }

  // Step 4: Recalculate Course Rating
  const courseReviews = await prisma.review.findMany({
    where: { courseId, isDeleted: false },
    select: { rating: true },
  });

  const courseRatingCount = courseReviews.length;
  const courseAvgRating =
    courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseRatingCount;

  await prisma.course.update({
    where: { id: courseId },
    data: {
      avgRating: parseFloat(courseAvgRating.toFixed(1)),
      ratingCount: courseRatingCount,
    },
  });

  // Step 5: Recalculate Author Rating
  const authorIdOfCourse = course.authorId;

  const authorCourses = await prisma.course.findMany({
    where: { authorId: authorIdOfCourse, isDeleted: false },
    select: { avgRating: true, ratingCount: true },
  });

  const totalRatings = authorCourses.reduce((sum, c) => sum + c.ratingCount, 0);
  const totalWeightedRating = authorCourses.reduce(
    (sum, c) => sum + c.avgRating * c.ratingCount,
    0,
  );

  const authorAvgRating = totalRatings ? totalWeightedRating / totalRatings : 0;

  if (authorIdOfCourse) {
    await prisma.user.update({
      where: { id: authorIdOfCourse },
      data: {
        avgRating: parseFloat(authorAvgRating.toFixed(1)),
        ratingCount: totalRatings,
      },
    });
  }

  return review;
};

const getAllFromDB = async (
  params: IReviewFilterRequest,
  options: IPaginationOptions,
  courseId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ReviewWhereInput[] = [];
  if (courseId) {
    andConditions.push({ courseId });
  }

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
    include: {
      author: {
        select: {
          id: true,
          name: true,
          photoUrl: true,
        },
      },
      reviewRef: {
        select: {
          id: true,
          comment: true,
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      },
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
          photoUrl: true,
        },
      },
      reviewRef: {
        select: {
          id: true,
          comment: true,
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
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
  payload: Partial<IReview>,
): Promise<Review> => {
  const review = await prisma.review.findUnique({
    where: { id },
  });
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found!');
  }

  const result = await prisma.review.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Review> => {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id },
  });
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Review not found!');
  }

  const result = await prisma.review.update({
    where: { id },
    data: {
      isDeleted: true,
    },
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
