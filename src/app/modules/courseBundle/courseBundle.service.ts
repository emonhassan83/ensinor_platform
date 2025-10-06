import {
  CourseBundle,
  Prisma,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  ICourseBundle,
  ICourseBundleFilterRequest,
} from './courseBundle.interface';
import { courseBundleSearchAbleFields } from './courseBundle.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { uploadToS3 } from '../../utils/s3';
import httpStatus from 'http-status';

// ---------------- Insert ----------------
const insertIntoDB = async (payload: ICourseBundle, file: any) => {
  const { authorId, course: courseIds, discount = 0, ...bundleData } = payload;

  const author = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
    include: {
      subscription: true,
    },
  });
  if (!author) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Author not found or inactive!');
  }

  // If author is an instructor → check subscription
  if (author.role === UserRole.instructor) {
    const activeSubscription = author.subscription.find(
      sub =>
        sub.status === SubscriptionStatus.active &&
        sub.isExpired === false &&
        sub.isDeleted === false &&
        new Date(sub.expiredAt) > new Date(),
    );
    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'You need an active subscription to add bundle course items.',
      );
    }
  }

  // Validate Courses belong to this author
  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      // instructorId: authorId,
      isDeleted: false,
    },
    select: {
      id: true,
      companyId: true,
      platform: true,
      price: true,
      lectures: true,
      duration: true,
    },
  });
  if (courses.length !== courseIds.length) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'One or more courses do not belong to this author!',
    );
  }

  // Assign companyId if any course has it
  const companyIds = courses
    .map(c => c.companyId)
    .filter((id): id is string => !!id);

  if (companyIds.length > 0) {
    // Ensure all courses are from the same company
    const uniqueCompanyIds = [...new Set(companyIds)];
    if (uniqueCompanyIds.length > 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'All courses in a bundle must belong to the same company!',
      );
    }

    bundleData.companyId = uniqueCompanyIds[0];
  }

  // Assign platform
  const platforms = [...new Set(courses.map(c => c.platform))];
  if (platforms.length > 1) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'All courses in a bundle must have the same platform!',
    );
  }
  bundleData.platform = platforms[0]; // take the only platform

  // --- Calculate total price ---
  const totalCoursePrice = courses.reduce((sum, c) => sum + (c.price || 0), 0);
  const discountAmount = (totalCoursePrice * discount) / 100;
  const finalPrice = Math.max(totalCoursePrice - discountAmount, 0);

  // --- Calculate total lectures & duration ---
  const totalLectures = courses.reduce((sum, c) => sum + (c.lectures || 0), 0);
  const totalDuration = courses.reduce((sum, c) => sum + (c.duration || 0), 0);

  // upload to image
  if (file) {
    payload.thumbnail = (await uploadToS3({
      file,
      fileName: `images/course-bundles/thumbnail/${Math.floor(100000 + Math.random() * 900000)}`,
    })) as string;
  }

  // 🔹 Set free flag if price = 0
  if (typeof payload.price === 'number' && payload.price === 0) {
    payload.isFreeCourse = true;
  }

  const result = await prisma.courseBundle.create({
    data: {
      ...bundleData,
      price: Math.round(finalPrice),
      discount,
      thumbnail: payload.thumbnail,
      authorId,
      lectures: totalLectures,
      duration: totalDuration,
      courseBundleCourses: {
        create: courseIds.map(courseId => ({
          course: { connect: { id: courseId } },
        })),
      },
    },
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Course bundle creation failed!',
    );
  }
  return result;
};

const getAllFromDB = async (
  params: ICourseBundleFilterRequest,
  options: IPaginationOptions,
  filterBy: { authorId?: string; companyId?: string },
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.CourseBundleWhereInput[] = [{ isDeleted: false }];
  // Filter either by authorId, instructorId
  if (filterBy.authorId) {
    andConditions.push({ authorId: filterBy.authorId });
  }
  if (filterBy.companyId) {
    andConditions.push({ companyId: filterBy.companyId });
  }

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

const getByIdFromDB = async (id: string): Promise<CourseBundle | null> => {
  const result = await prisma.courseBundle.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: { select: { id: true, name: true, email: true, photoUrl: true } },
      courseBundleCourses: { include: { course: true } },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Course bundle not found!');
  }
  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<ICourseBundle>,
  file: any,
): Promise<CourseBundle> => {
  const bundle = await prisma.courseBundle.findUnique({
    where: { id, isDeleted: false },
  });
  if (!bundle) {
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
    data: {
      ...payload,
      thumbnail: payload.thumbnail,
    },
    include: {
      author: true,
      courseBundleCourses: { include: { course: true } },
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Course bundle not updated!');
  }
  return result;
};

const deleteFromDB = async (id: string): Promise<CourseBundle> => {
  const bundle = await prisma.courseBundle.findUnique({
    where: { id, isDeleted: false },
  });
  if (!bundle) {
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
