import { EnrolledCourse, Prisma, Quiz, QuizAttempt } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IEnrolledCourse, IEnrolledCourseFilterRequest } from './enrolledCourse.interface';
import { enrolledCourseSearchAbleFields } from './enrolledCourse.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';

const insertIntoDB = async (payload: IEnrolledCourse) => {
  const { authorId, courseId } = payload;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId
    }
  })
  if (!course || course?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Courses not found!');
  }

  const user = await prisma.user.findFirst({
    where: {
      id: authorId
    }
  })
  if (!user || user?.isDeleted) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Enroll course user not found!');
  }

  const result = await prisma.enrolledCourse.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Enroll course creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IEnrolledCourseFilterRequest,
  options: IPaginationOptions,
  authorId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EnrolledCourseWhereInput[] = [
    { authorId, isDeleted: false },
  ];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: enrolledCourseSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.EnrolledCourseWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.enrolledCourse.findMany({
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
        author: true,
        course: true
      }
  });

  const total = await prisma.enrolledCourse.count({
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

const getByIdFromDB = async (id: string): Promise<EnrolledCourse | null> => {
  const result = await prisma.enrolledCourse.findUnique({
    where: { id },
    include: {
      author: true,
        course: true
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Enroll course not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEnrolledCourse>,
): Promise<EnrolledCourse> => {
  const enrollCourse = await prisma.enrolledCourse.findUnique({
    where: { id },
  });
  if (!enrollCourse || enrollCourse?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enroll course not found!');
  }

  const result = await prisma.enrolledCourse.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enroll course not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<EnrolledCourse> => {
  const enrollCourse = await prisma.enrolledCourse.findUniqueOrThrow({
    where: { id },
  });
  if (!enrollCourse || enrollCourse?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enroll course not found!');
  }

  const result = await prisma.enrolledCourse.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enroll course not deleted!');
  }

  return result;
};

export const EnrolledCourseService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
