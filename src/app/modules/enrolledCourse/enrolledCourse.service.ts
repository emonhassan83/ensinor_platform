import {
  ChatRole,
  ChatType,
  CoursesStatus,
  EnrolledCourse,
  PlatformType,
  Prisma,
  UserStatus,
} from '@prisma/client';
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
import { sendCourseCompleteNotifYToAuthor } from './enrolledCourse.utils';
import { sendCourseEnrollmentEmail } from '../../utils/email/courseEnrolledmentEmail';

const insertIntoDB = async (payload: IEnrolledCourse) => {
  const { userId, courseId } = payload;

  // 1. Fetch course
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  });
  if (!course) throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');

  // 2. Fetch user
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      status: UserStatus.active,
      isDeleted: false,
    },
  });
  if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');

  // 3. Check if already enrolled
  const existingEnrollment = await prisma.enrolledCourse.findFirst({
    where: { userId, courseId, isDeleted: false },
  });
  if (existingEnrollment) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'User is already enrolled in this course!',
    );
  }

  // 4. Transaction → enrolledCourse + increments
  const enrolledCourse = await prisma.$transaction(async tx => {
    const newEnroll = await tx.enrolledCourse.create({
      data: {
        userId,
        courseId,
        authorId: course.authorId,
        platform: course.platform,
        courseCategory: course.category,
      },
    });

    // 5. Increment student/employee counters
    if (user.role === 'student') {
      await tx.student.update({
        where: { userId },
        data: { courseEnrolled: { increment: 1 } },
      });
    } else if (user.role === 'employee') {
      await tx.employee.update({
        where: { userId },
        data: { courseEnrolled: { increment: 1 } },
      });
    }

    // 6. Increment instructor / business instructor / company counters
    if (course.platform === PlatformType.admin) {
      // Admin platform → Instructor
      await tx.instructor.updateMany({
        where: { userId: course.authorId },
        data: { enrolled: { increment: 1 } },
      });
    } else if (course.platform === PlatformType.company) {
      if (course.companyId) {
        // Increment BusinessInstructor (enrolled count)
        await tx.businessInstructor.updateMany({
          where: { companyId: course.companyId, authorId: course.authorId },
          data: { enrolled: { increment: 1 } },
        });

        // Increment Company (enrolled count)
        await tx.company.update({
          where: { id: course.companyId },
          data: { enrolled: { increment: 1 } },
        });

        // Increment CompanyAdmin (enrolled count)
        await tx.companyAdmin.updateMany({
          where: { company: { id: course.companyId } },
          data: { enrolled: { increment: 1 } },
        });
      }
    }

    return newEnroll;
  });

  // 7. Auto-join student into chats
  const chats = await prisma.chat.findMany({
    where: {
      courseId: course.id,
      type: { in: [ChatType.group, ChatType.announcement] },
      isDeleted: false,
    },
  });

  for (const chat of chats) {
    const alreadyParticipant = await prisma.chatParticipant.findFirst({
      where: { chatId: chat.id, userId },
    });

    if (!alreadyParticipant) {
      await prisma.chatParticipant.create({
        data: {
          userId,
          chatId: chat.id,
          role: ChatRole.member,
        },
      });
    }
  }

  // 8. Send congratulatory email
  await sendCourseEnrollmentEmail(
    user.email,
    user.name,
    course.title,
    'https://dashboard.ensinor.com',
  );

  // 9. Monthly Streak Bonus
  if (course.price > 0) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const monthlyPurchases = await prisma.enrolledCourse.count({
      where: {
        userId,
        isDeleted: false,
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        course: { price: { gt: 0 } },
      },
    });

    if (monthlyPurchases > 1) {
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: 50 } },
      });
    }
  }

  return enrolledCourse;
};

const enrollBundleCourses = async (payload: {
  userId: string;
  bundleId: string;
}) => {
  const { userId, bundleId } = payload;

  // 1. Fetch user
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    include: { student: true, employee: true },
  });
  if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');

  // 2. Fetch bundle and its courses
  const bundle = await prisma.courseBundle.findFirst({
    where: { id: bundleId, isDeleted: false },
    include: {
      courseBundleCourses: { select: { courseId: true } },
    },
  });

  if (!bundle || bundle.courseBundleCourses.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Bundle or courses not found!');
  }

  const courseIds = bundle.courseBundleCourses.map(c => c.courseId);

  // 3. Fetch courses to ensure they are approved
  const courses = await prisma.course.findMany({
    where: {
      id: { in: courseIds },
      status: CoursesStatus.approved,
      isDeleted: false,
    },
  });
  if (courses.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No valid courses found!');
  }

  // 4. Fetch existing enrollments
  const existingEnrollments = await prisma.enrolledCourse.findMany({
    where: { userId, courseId: { in: courseIds } },
    select: { courseId: true },
  });
  const alreadyEnrolledSet = new Set(existingEnrollments.map(e => e.courseId));

  // 5. Filter courses that are not already enrolled
  const filteredCourses = courses.filter(c => !alreadyEnrolledSet.has(c.id));
  if (filteredCourses.length === 0) {
    return { success: false, message: 'All courses already enrolled' };
  }

  // 6. Prepare enroll data
  const enrollData = filteredCourses.map(c => ({
    userId,
    courseId: c.id,
    authorId: c.authorId,
    platform: c.platform,
    courseCategory: c.category,
  }));

  // 7. Bulk insert enrolled courses
  await prisma.enrolledCourse.createMany({
    data: enrollData,
    skipDuplicates: true,
  });

  // 8. Update student or employee profile courseEnrolled
  const incrementCount = filteredCourses.length;
  if (user.student) {
    await prisma.student.update({
      where: { userId },
      data: { courseEnrolled: { increment: incrementCount } },
    });
  } else if (user.employee) {
    await prisma.employee.update({
      where: { userId },
      data: { courseEnrolled: { increment: incrementCount } },
    });
  }

  // 9. Update instructor / business instructor / company enrolled counts
  for (const c of filteredCourses) {
    if (c.platform === 'admin') {
      // Instructor enrolled increment
      await prisma.instructor.updateMany({
        where: { userId: c.authorId },
        data: { enrolled: { increment: 1 } },
      });
    } else if (c.platform === 'company' && c.companyId) {
      // Business instructor enrolled increment
      await prisma.businessInstructor.updateMany({
        where: { authorId: c.authorId, companyId: c.companyId },
        data: { enrolled: { increment: 1 } },
      });
      // Company enrolled increment
      await prisma.company.update({
        where: { id: c.companyId },
        data: { enrolled: { increment: 1 } },
      });
    }
  }

  // 10. Increment bundle enrollments
  await prisma.courseBundle.update({
    where: { id: bundleId },
    data: { enrollments: { increment: 1 } },
  });

  // 11. Auto-join user into all chats (discussion + announcement) of each course
  for (const course of filteredCourses) {
    const chats = await prisma.chat.findMany({
      where: {
        courseId: course.id,
        type: { in: [ChatType.group, ChatType.announcement] },
        isDeleted: false,
      },
    });

    for (const chat of chats) {
      const alreadyParticipant = await prisma.chatParticipant.findFirst({
        where: { chatId: chat.id, userId },
      });

      if (!alreadyParticipant) {
        await prisma.chatParticipant.create({
          data: {
            userId,
            chatId: chat.id,
            role: ChatRole.member,
          },
        });
      }
    }

    //12. send congratulation email for each course
    await sendCourseEnrollmentEmail(
      user.email,
      user.name,
      course.title,
      `https://dashboard.ensinor.com/courses/${course.id}`,
    );
  }

  // 13. Monthly Streak Bonus Check (for bundle purchases) ---
  const paidCourses = filteredCourses.filter(c => c.price > 0);
  if (paidCourses.length > 0) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const monthlyPurchases = await prisma.enrolledCourse.count({
      where: {
        userId,
        isDeleted: false,
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        course: { price: { gt: 0 } },
      },
    });

    if (monthlyPurchases > paidCourses.length) {
      // of have one paid course here
      await prisma.user.update({
        where: { id: userId },
        data: { points: { increment: 50 } },
      });
    }
  }

  return filteredCourses;
};

const getAllFromDB = async (
  params: IEnrolledCourseFilterRequest,
  options: IPaginationOptions,
  userId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EnrolledCourseWhereInput[] = [
    { userId, isDeleted: false },
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
          duration: true,
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
      course: {
        select: {
          id: true,
          shortDescription: true,
          thumbnail: true,
          description: true,
          lectures: true,
          courseContent: true,
          quiz: true,
          assignment: true,
        },
      },
    },
  });

  if (!enrolledCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Oops! Enroll course not found!');
  }
  const watchedLectures = enrolledCourse.watchedLectures.length;

  const result = {
    ...enrolledCourse,
    lectureWatched: watchedLectures,
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
    (updated.lectureWatched / totalLectures) * 100,
  );

  // Update completion status if all lectures watched
  const finalUpdate = await prisma.enrolledCourse.update({
    where: { id: enrolledCourseId },
    data: {
      completedRate: completedRate,
    },
  });

  return finalUpdate;
};

const completeCourseIntoDB = async (id: string): Promise<EnrolledCourse> => {
  const enrollCourse = await prisma.enrolledCourse.findUnique({
    where: { id, isDeleted: false },
    include: {
      user: true,
      course: true,
    },
  });

  if (!enrollCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enrolled course not found!');
  }

  const result = await prisma.enrolledCourse.update({
    where: { id },
    data: { isComplete: true },
    include: {
      user: true,
      course: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Enrolled course not updated!');
  }

  // If course completed, notify the author
  if (result.isComplete && result.course?.authorId) {
    await sendCourseCompleteNotifYToAuthor(
      result.user,
      result.course,
      enrollCourse.authorId,
    );
  }

  // --- POINTS ALLOCATION ---
  let awardedPoints = 0;

  const durationMins = result.learningTime ?? 0; // course duration in minutes
  const price = result.course?.price ?? 0; // course price

  // Find current user info (to check freePoints cap)
  const currentUser = await prisma.user.findUnique({
    where: { id: enrollCourse.user.id },
    select: { points: true, freePoints: true },
  });

  if (!currentUser) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'User not found for awarding points',
    );
  }

  // Case 1: Paid course
  if (price > 0) {
    awardedPoints = durationMins >= 600 || price >= 30 ? 200 : 100;

    await prisma.user.update({
      where: { id: enrollCourse.user.id },
      data: {
        points: { increment: awardedPoints },
      },
    });
  }

  // Case 2: Free course
  else {
    // Award 50 points per free course, cap at 250
    if (currentUser.freePoints < 250) {
      // Ensure we don’t cross the 250 cap
      const remainingCap = 250 - currentUser.freePoints;
      const pointsToAdd = Math.min(50, remainingCap);

      await prisma.user.update({
        where: { id: enrollCourse.user.id },
        data: {
          points: { increment: pointsToAdd },
          freePoints: { increment: pointsToAdd },
        },
      });

      awardedPoints = pointsToAdd;
    } else {
      // Cap already reached, no points awarded
      awardedPoints = 0;
    }
  }

  //  update the completed all table
  if (
    result.course.platform === PlatformType.company &&
    result.course.companyId
  ) {
    await prisma.company.update({
      where: { id: result.course.companyId },
      data: { completed: { increment: 1 } },
    });
  }
  // check user employee or student
  const employee = await prisma.employee.findUnique({
    where: { userId: enrollCourse.user.id },
  });

  if (employee) {
    // employee completed increment
    await prisma.employee.update({
      where: { userId: enrollCourse.user.id },
      data: { courseCompleted: { increment: 1 } },
    });
  } else {
    // student completed increment
    const student = await prisma.student.findUnique({
      where: { userId: enrollCourse.user.id },
    });

    if (student) {
      await prisma.student.update({
        where: { userId: enrollCourse.user.id },
        data: { courseCompleted: { increment: 1 } },
      });
    }
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
  enrollBundleCourses,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  watchLectureIntoDB,
  completeCourseIntoDB,
  deleteFromDB,
};
