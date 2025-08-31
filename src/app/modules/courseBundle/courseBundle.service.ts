import {
  Course,
  CourseBundle,
  Prisma,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { ICourseBundle, ICourseBundleFilterRequest } from './courseBundle.interface';
import { courseBundleSearchAbleFields } from './courseBundle.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';

// ---------------- Insert ----------------
const insertIntoDB = async (payload: ICourseBundle, file: any) => {
  // upload to image
   if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/course-bundles/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.courseBundle.create({
    data: payload,
    include: {
      author: true,
      courseBundleCourses: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Course bundle creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: ICourseBundleFilterRequest,
  options: IPaginationOptions,
  userId?: string
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CourseBundleWhereInput[] = [{ authorId: userId, isDeleted: false }];

  // Search across Package and nested User fields
  if (searchTerm) {
      andConditions.push({
        OR: courseBundleSearchAbleFields.map(field => ({
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

  const whereConditions: Prisma.CourseBundleWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.courseBundle.findMany({
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
      courseBundleCourses: { include: { course: true } },
    },
  });

  const total = await prisma.courseBundle.count({
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

const getByIdFromDB = async (id: string): Promise<Course | null> => {
  const result = await prisma.course.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, email: true, photoUrl: true } },
      courseBundleCourses: { include: { course: true } },
    },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Course bundle not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICourseBundle>,
  file: any,
): Promise<CourseBundle> => {
  const bundle = await prisma.courseBundle.findUnique({ where: { id } });
  if (!bundle || bundle?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course bundle not found!');
  }

  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/course-bundles/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  const result = await prisma.courseBundle.update({
    where: { id },
    data: payload,
    include: {
      author: true,
      courseBundleCourses: true,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course bundle not updated!');
  }
  return result;
};

const deleteFromDB = async (id: string): Promise<CourseBundle> => {
  const bundle = await prisma.courseBundle.findUnique({ where: { id } });
  if (!bundle || bundle?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course bundle not found!');
  }

  const result = await prisma.courseBundle.update({
    where: { id },
    data: { isDeleted: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course bundle not deleted!');
  }
  return result;
};

export const CourseBundleService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
