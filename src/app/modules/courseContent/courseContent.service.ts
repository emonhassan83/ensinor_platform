import { CourseContent, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICourseContent,
  ICourseContentFilterRequest,
} from './courseContent.interface';
import { courseContentSearchAbleFields } from './courseContent.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: ICourseContent, file: any) => {
  const { courseId } = payload;

  const course = await prisma.course.findFirst({
    where: { id: courseId, isDeleted: false },
  });
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  // upload to image
  if (file) {
    payload.video = (await uploadToS3({
      file,
      fileName: `videos/courses/content/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.courseContent.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Course content creation failed!',
    );
  }

  // Insert new content
  await prisma.course.update({
    where: { id: payload.courseId },
    data: {
      lectures: { increment: 1 },
      duration: { increment: payload.duration },
    },
  });

  return result;
};

const getAllFromDB = async (
  params: ICourseContentFilterRequest,
  options: IPaginationOptions,
  courseId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CourseContentWhereInput[] = [{ courseId }];

  // Search across Package and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: courseContentSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CourseContentWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.courseContent.findMany({
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

  const total = await prisma.courseContent.count({
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

const getByIdFromDB = async (id: string): Promise<CourseContent | null> => {
  const result = await prisma.courseContent.findUnique({
    where: { id },
    include: {
      course: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Course not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICourseContent>,
  file: any,
): Promise<CourseContent> => {
  const content = await prisma.courseContent.findUnique({
    where: { id },
  });
  if (!content) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course content not found!');
  }

  // upload to image
  if (file) {
    payload.video = (await uploadToS3({
      file,
      fileName: `videos/courses/content/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.courseContent.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course content not updated!');
  }

  // if duration updated, adjust difference
  if (payload.duration && payload.duration !== content.duration) {
    const diff = payload.duration - content.duration;
    await prisma.course.update({
      where: { id: content.courseId },
      data: {
        duration: { increment: diff },
      },
    });
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<CourseContent> => {
  const content = await prisma.courseContent.findUniqueOrThrow({
    where: { id },
  });
  if (!content) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course content not found!');
  }

  const result = await prisma.courseContent.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course content not deleted!');
  }

  // decrement lectures and subtract duration
  await prisma.course.update({
    where: { id: content.courseId },
    data: {
      lectures: { decrement: 1 },
      duration: { decrement: content.duration || 0 },
    },
  });

  return result;
};

export const CourseContentService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
