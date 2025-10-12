import {
  Course,
  CourseBundle,
  Prisma,
  Review,
  ReviewModelType,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IReview, IReviewFilterRequest } from './review.interface';
import { reviewSearchAbleFields } from './review.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IReview) => {
  const { authorId, courseId, courseBundleId, modelType, rating } = payload;

  // Step 1: Validate review author
  const user = await prisma.user.findFirst({
    where: { id: authorId, isDeleted: false, status: UserStatus.active },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Review user not found!');
  }

  let course: Course | null = null;
  let bundle: CourseBundle | null = null;
  let authorIdToUpdate: string | null = null;

  // Step 2: Validate based on modelType
  if (modelType === ReviewModelType.course) {
    if (!courseId)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'courseId is required for course review!',
      );

    course = await prisma.course.findFirst({
      where: { id: courseId, isDeleted: false },
    });
    if (!course)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');
    authorIdToUpdate = course.authorId;
  }

  if (modelType === ReviewModelType.bundle_course) {
    if (!courseBundleId)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'courseBundleId is required for bundle review!',
      );

    bundle = await prisma.courseBundle.findFirst({
      where: { id: courseBundleId, isDeleted: false },
    });
    if (!bundle)
      throw new ApiError(httpStatus.BAD_REQUEST, 'Course bundle not found!');
    authorIdToUpdate = bundle.authorId;
  }

  // Step 3: Create Review
  const review = await prisma.review.create({
    data: payload,
  });

  // Step 4: Recalculate Course or Bundle Rating
  if (modelType === ReviewModelType.course && course) {
    const courseReviews = await prisma.review.findMany({
      where: { courseId: course.id, isDeleted: false },
      select: { rating: true },
    });

    const count = courseReviews.length;
    const avgRating = count
      ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    await prisma.course.update({
      where: { id: course.id },
      data: { avgRating: parseFloat(avgRating.toFixed(1)), ratingCount: count },
    });
  }

  if (modelType === ReviewModelType.bundle_course && bundle) {
    const bundleReviews = await prisma.review.findMany({
      where: { courseBundleId: bundle.id, isDeleted: false },
      select: { rating: true },
    });

    const count = bundleReviews.length;
    const avgRating = count
      ? bundleReviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    await prisma.courseBundle.update({
      where: { id: bundle.id },
      data: { avgRating: parseFloat(avgRating.toFixed(1)), ratingCount: count },
    });
  }

  // Step 5: Recalculate Instructor / Author Rating
  if (authorIdToUpdate) {
    const coursesByAuthor = await prisma.course.findMany({
      where: { authorId: authorIdToUpdate, isDeleted: false },
      select: { avgRating: true, ratingCount: true },
    });

    const totalRatings = coursesByAuthor.reduce(
      (sum, c) => sum + c.ratingCount,
      0,
    );
    const totalWeightedRating = coursesByAuthor.reduce(
      (sum, c) => sum + c.avgRating * c.ratingCount,
      0,
    );

    const avgAuthorRating = totalRatings
      ? totalWeightedRating / totalRatings
      : 0;

    await prisma.user.update({
      where: { id: authorIdToUpdate },
      data: {
        avgRating: parseFloat(avgAuthorRating.toFixed(1)),
        ratingCount: totalRatings,
      },
    });
  }

  return review;
};

const getAllFromDB = async (
  params: IReviewFilterRequest,
  options: IPaginationOptions,
  filterBy?: { courseId?: string; courseBundleId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.ReviewWhereInput[] = [{ isDeleted: false }];
  if (filterBy && filterBy.courseId) {
    andConditions.push({ courseId: filterBy.courseId });
  }
  if (filterBy && filterBy.courseBundleId) {
    andConditions.push({ courseBundleId: filterBy.courseBundleId });
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
    where: { id, isDeleted: false },
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
    where: { id, isDeleted: false },
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
    where: { id, isDeleted: false },
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
