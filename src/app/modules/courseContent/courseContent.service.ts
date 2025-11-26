import {
  CourseContent,
  CourseLesson,
  CourseSection,
  Prisma,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICourseLesson,
  ICourseContentFilterRequest,
  ICourseSection,
} from './courseContent.interface';
import { courseContentSearchAbleFields } from './courseContent.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: ICourseSection, authorId: string) => {
  const { courseId, lesson } = payload;

  const course = await prisma.course.findFirst({
    where: { id: courseId, authorId, isDeleted: false },
  });
  if (!course) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course not found!');
  }

  const result = await prisma.courseSection.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Course lesson creation failed!',
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

const addLessonIntoDB = async (payload: ICourseLesson, authorId: string) => {
  const { sectionId } = payload;

  const courseSection = await prisma.courseSection.findFirst({
    where: { id: sectionId },
    include: {
      course: {
        select: { id: true },
      },
    },
  });
  if (!courseSection) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course section not found!');
  }

  const result = await prisma.courseLesson.create({
    data: payload,
  });
  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Course lesson creation failed!',
    );
  }

  // Insert new content
  await prisma.course.update({
    where: { id: courseSection.course.id },
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

  const andConditions: Prisma.CourseSectionWhereInput[] = [{ courseId }];

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

  const whereConditions: Prisma.CourseSectionWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.courseSection.findMany({
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
      courseContents: true,
    },
  });

  const total = await prisma.courseSection.count({
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
  payload: Partial<ICourseSection>,
): Promise<CourseSection> => {
  const content = await prisma.courseSection.findUnique({
    where: { id },
  });
  if (!content) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course section not found!');
  }

  const result = await prisma.courseSection.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course section not updated!');
  }

  return result;
};

const updateLessonIntoDB = async (
  id: string,
  payload: Partial<ICourseLesson>,
): Promise<CourseLesson> => {
  const content = await prisma.courseLesson.findUnique({
    where: { id },
    include: { section: { include: { course: { select: { id: true } } } } },
  });
  if (!content) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course lesson not found!');
  }

  const result = await prisma.courseLesson.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course lesson not updated!');
  }

  // if duration updated, adjust difference
  if (
    payload.duration &&
    content.duration &&
    payload.duration !== content.duration
  ) {
    const diff = payload.duration - content.duration;
    await prisma.course.update({
      where: { id: content.section.course.id },
      data: {
        duration: { increment: diff },
      },
    });
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<CourseContent> => {
  const content = await prisma.courseSection.findUniqueOrThrow({
    where: { id },
  });
  if (!content) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course section not found!');
  }

  const result = await prisma.courseSection.delete({
    where: { id },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course section not deleted!');
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
  addLessonIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  updateLessonIntoDB,
  deleteFromDB,
};
