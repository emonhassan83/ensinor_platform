import { EnrolledCourse, Prisma, UserStatus } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IEnrolledCourse,
  IEnrolledCourseFilterRequest,
} from './enrolledCourse.interface';
import { enrolledCourseSearchAbleFields } from './enrolledCourse.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IEnrolledCourse) => {
  const { authorId, courseId } = payload;
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      isDeleted: false,
    },
  });
  if (!course) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Courses not found!');
  }

  const user = await prisma.user.findFirst({
    where: {
      id: authorId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Enroll course user not found!');
  }

  const result = await prisma.enrolledCourse.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Enroll course creation failed!',
    );
  }
  return result;
};

const enrollCoursesBulk = async (
  enrollments: { authorId: string; courseId: string; type: string; courseCategory: string }[]
) => {
  try {
    if (enrollments.length === 0) {
      return { success: false, message: "No enrollments provided" };
    }

    // ✅ Check all authors exist
    const authorIds = [...new Set(enrollments.map((e) => e.authorId))];
    const existingAuthors = await prisma.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true },
    });
    const missingAuthors = authorIds.filter(
      (id) => !existingAuthors.find((a) => a.id === id)
    );
    if (missingAuthors.length > 0) {
      throw new Error(`Invalid author(s): ${missingAuthors.join(", ")}`);
    }

    // ✅ Check all courses exist
    const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
    const existingCourses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      select: { id: true },
    });
    const missingCourses = courseIds.filter(
      (id) => !existingCourses.find((c) => c.id === id)
    );
    if (missingCourses.length > 0) {
      throw new Error(`Invalid course(s): ${missingCourses.join(", ")}`);
    }

    // ✅ Check for existing enrollments to avoid duplicates
    const existingEnrollments = await prisma.enrolledCourse.findMany({
      where: {
        OR: enrollments.map((e) => ({
          authorId: e.authorId,
          courseId: e.courseId,
        })),
      },
      select: { authorId: true, courseId: true },
    });

    const existingSet = new Set(
      existingEnrollments.map((e) => `${e.authorId}-${e.courseId}`)
    );

    const filteredEnrollments = enrollments.filter(
      (e) => !existingSet.has(`${e.authorId}-${e.courseId}`)
    );

    if (filteredEnrollments.length === 0) {
      return { success: false, message: "All courses already enrolled" };
    }

    // ✅ Bulk insert with type & courseCategory
    const created = await prisma.enrolledCourse.createMany({
      data: filteredEnrollments.map((e) => ({
        authorId: e.authorId,
        courseId: e.courseId,
        type: e.type as any, // cast to enum if needed
        courseCategory: e.courseCategory,
      })),
      skipDuplicates: true,
    });

    return {
      success: true,
      message: "Enrollments created successfully",
      count: created.count,
    };
  } catch (error: any) {
    console.error("Error bulk enrolling:", error);
    throw new Error(error.message || "Failed to enroll courses");
  }
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
      course: {
        select: {
          id: true,
          title: true,
          description: true,
          thumbnail: true,
          category: true,
        },
      },
    },
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

const getByIdFromDB = async (id: string) => {
  const enrolledCourse = await prisma.enrolledCourse.findUnique({
    where: { id, isDeleted: false },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
        },
      },
      watchedLectures: true,
      course: { select: { lectures: true, courseContent: true } },
    },
  });

  if (!enrolledCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Enroll course not found!');
  }
  const totalLectures = enrolledCourse.course.courseContent.length;
  const watchedLectures = enrolledCourse.watchedLectures.length;

  const result = {
    ...enrolledCourse,
    lectureWatched: watchedLectures,
    totalLectures: totalLectures,
  };

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IEnrolledCourse>,
): Promise<EnrolledCourse> => {
  const enrollCourse = await prisma.enrolledCourse.findUnique({
    where: { id, isDeleted: false },
  });
  if (!enrollCourse) {
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

const watchLectureIntoDB = async (payload: {
  enrolledCourseId: string;
  lectureId: string;
}): Promise<EnrolledCourse> => {
  const { enrolledCourseId, lectureId } = payload;
  // Fetch enrolled course
  const enrolledCourse = await prisma.enrolledCourse.findUnique({
    where: { id: enrolledCourseId },
    include: {
      watchedLectures: true,
      course: {
        select: { lectures: true, courseContent: true },
      },
    },
  });

  if (!enrolledCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enrolled course not found!');
  }

  // Check if lecture already watched
  if (enrolledCourse.watchedLectures.some(l => l.id === lectureId)) {
    // Already watched, just update lastActivity
    const updated = await prisma.enrolledCourse.update({
      where: { id: enrolledCourseId },
      data: { lastActivity: new Date() },
    });
    return updated;
  }

  // Fetch lecture duration
  const lecture = await prisma.courseContent.findUnique({
    where: { id: lectureId },
  });
  if (!lecture) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lecture not found!');
  }

  // Connect lecture to enrolledCourse
  const updated = await prisma.enrolledCourse.update({
    where: { id: enrolledCourseId },
    data: {
      watchedLectures: {
        connect: { id: lectureId },
      },
      lectureWatched: { increment: 1 },
      learningTime: { increment: Math.ceil(lecture.duration) }, // minutes
      lastActivity: new Date(),
    },
  });

  // Calculate completedRate
  const totalLectures = enrolledCourse.course.courseContent.length;
  const completedRate = Math.floor(
    ((updated.lectureWatched) / totalLectures) * 100,
  );

  // Update completion status if all lectures watched
  const finalUpdate = await prisma.enrolledCourse.update({
    where: { id: enrolledCourseId },
    data: {
      completedRate: completedRate,
      isComplete: completedRate === 100,
    },
  });

  return finalUpdate;
};

const completeCourseIntoDB = async (id: string): Promise<EnrolledCourse> => {
  const enrollCourse = await prisma.enrolledCourse.findUnique({
    where: { id, isDeleted: false },
  });
  if (!enrollCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enroll course not found!');
  }

  const result = await prisma.enrolledCourse.update({
    where: { id },
    data: { isComplete: true },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enroll course not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<EnrolledCourse> => {
  const enrollCourse = await prisma.enrolledCourse.findUniqueOrThrow({
    where: { id, isDeleted: false },
  });
  if (!enrollCourse) {
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
  enrollCoursesBulk,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  watchLectureIntoDB,
  completeCourseIntoDB,
  deleteFromDB,
};
