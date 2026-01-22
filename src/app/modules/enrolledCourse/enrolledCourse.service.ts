import {
  AchievementModelType,
  ChatRole,
  ChatType,
  Course,
  CourseGrade,
  CoursesStatus,
  EnrolledCourse,
  EnrolledLogsModelType,
  PlatformType,
  Prisma,
  User,
  UserStatus,
} from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IBulkEnrolledCourse,
  IDepartmentEnrolledCourse,
  IEnrolledCourse,
  IEnrolledCourseFilterRequest,
  IGroupEnrolledCourse,
} from './enrolledCourse.interface';
import { enrolledCourseSearchAbleFields } from './enrolledCourse.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import {
  checkAndAwardAllEligibleBadges,
  checkAndAwardDailyLearningBadges,
  sendCourseCompleteNotifYToAuthor,
} from './enrolledCourse.utils';
import { sendCourseEnrollmentEmail } from '../../utils/email/courseEnrolledmentEmail';
import { calculateAchievementLevel } from '../../utils/achievementLevel';

// Static fallback grading system
const defaultGradingSystem = [
  { gradeLabel: 'A', minScore: 90, maxScore: 100 },
  { gradeLabel: 'B', minScore: 80, maxScore: 89 },
  { gradeLabel: 'C', minScore: 70, maxScore: 79 },
  { gradeLabel: 'D', minScore: 60, maxScore: 69 },
  { gradeLabel: 'F', minScore: 0, maxScore: 59 },
];

const enrollUser = async (tx: any, user: User, course: Course) => {
  // 1️⃣ Create enrollment
  const newEnroll = await tx.enrolledCourse.create({
    data: {
      userId: user.id,
      courseId: course.id,
      authorId: course.authorId,
      platform: course.platform,
      courseCategory: course.category,
    },
  });

  // 2️⃣ Increment student/employee counters
  if (user.role === 'student') {
    await tx.student.upsert({
      where: { userId: user.id },
      update: { courseEnrolled: { increment: 1 } },
      create: { userId: user.id, courseEnrolled: 1 },
    });
  } else if (user.role === 'employee') {
    await tx.employee.update({
      where: { userId: user.id },
      data: { courseEnrolled: { increment: 1 } },
    });
  }

  // 3️⃣ Increment instructor/business/company counters
  if (course.platform === PlatformType.admin) {
    await tx.instructor.updateMany({
      where: { userId: course.authorId },
      data: { enrolled: { increment: 1 } },
    });
  } else if (course.platform === PlatformType.company && course.companyId) {
    await tx.businessInstructor.updateMany({
      where: { companyId: course.companyId, authorId: course.authorId },
      data: { enrolled: { increment: 1 } },
    });
    await tx.company.update({
      where: { id: course.companyId },
      data: { enrolled: { increment: 1 } },
    });
    await tx.companyAdmin.updateMany({
      where: { company: { id: course.companyId } },
      data: { enrolled: { increment: 1 } },
    });
  }

  // 4️⃣ Add enrolled log
  await tx.enrolledLogs.create({
    data: {
      userId: user.id,
      courseId: course.id,
      modelType: EnrolledLogsModelType.course,
    },
  });

  // 5️⃣ Auto-join course chats
  const chats = await tx.chat.findMany({
    where: {
      courseId: course.id,
      type: { in: [ChatType.group, ChatType.announcement] },
      isDeleted: false,
    },
  });
  for (const chat of chats) {
    const alreadyParticipant = await tx.chatParticipant.findFirst({
      where: { chatId: chat.id, userId: user.id },
    });
    if (!alreadyParticipant) {
      await tx.chatParticipant.create({
        data: { userId: user.id, chatId: chat.id, role: ChatRole.member },
      });
    }
  }

  // 6️⃣ Send congratulatory email
  await sendCourseEnrollmentEmail(
    user.email,
    user.name,
    course.title,
    'https://dashboard.ensinor.com',
  );

  // 7️⃣ Monthly streak bonus + update achievement level
  if (course.price > 0) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const monthlyPurchases = await tx.enrolledCourse.count({
      where: {
        userId: user.id,
        isDeleted: false,
        createdAt: { gte: startOfMonth, lt: endOfMonth },
        course: { price: { gt: 0 } },
      },
    });

    if (monthlyPurchases > 1) {
      const achievement = await tx.achievement.upsert({
        where: { userId: user.id },
        update: {
          totalPoints: { increment: 50 },
          monthlyStreakPoints: { increment: 50 },
        },
        create: {
          userId: user.id,
          totalPoints: 50,
          monthlyStreakPoints: 50,
        },
      });

      await tx.achievementLogs.create({
        data: {
          userId: user.id,
          courseId: course.id,
          modelType: AchievementModelType.monthly_streak,
        },
      });

      // Update level
      const { level } = calculateAchievementLevel(achievement.totalPoints);
      await tx.achievement.update({
        where: { userId: user.id },
        data: { level },
      });
    }
  }

  return newEnroll;
};

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
      await tx.student.upsert({
        where: { userId },
        update: {
          courseEnrolled: { increment: 1 },
        },
        create: {
          userId,
          courseEnrolled: 1,
        },
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

    // 🧾  Add enrollment log (for audit/history)
    await tx.enrolledLogs.create({
      data: {
        userId,
        courseId,
        modelType: EnrolledLogsModelType.course,
      },
    });

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
      const achievement = await prisma.achievement.upsert({
        where: { userId },
        update: {
          totalPoints: { increment: 50 },
          monthlyStreakPoints: { increment: 50 },
        },
        create: {
          userId,
          totalPoints: 50,
          monthlyStreakPoints: 50,
        },
      });

      await prisma.achievementLogs.create({
        data: {
          userId,
          courseId: course.id,
          modelType: AchievementModelType.monthly_streak,
        },
      });

      // Update level
      const { level } = calculateAchievementLevel(achievement.totalPoints);
      await prisma.achievement.update({ where: { userId }, data: { level } });
    }
  }

  return enrolledCourse;
};

const groupEnrolledCourse = async (payload: IGroupEnrolledCourse) => {
  const { userIds, courseId } = payload;

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: CoursesStatus.approved, isDeleted: false },
  });
  if (!course) throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');

  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, status: UserStatus.active, isDeleted: false },
  });

  const existingEnrollments = await prisma.enrolledCourse.findMany({
    where: { courseId, userId: { in: userIds }, isDeleted: false },
  });

  const alreadyEnrolledUserIds = existingEnrollments.map(e => e.userId);
  const usersToEnroll = users.filter(
    u => !alreadyEnrolledUserIds.includes(u.id),
  );

  const enrolledUsers: string[] = [];
  const skippedUsers = alreadyEnrolledUserIds;

  if (usersToEnroll.length > 0) {
    await prisma.$transaction(
      async tx => {
        for (const user of usersToEnroll) {
          await enrollUser(tx, user, course);
          enrolledUsers.push(user.id);
        }
      },
      {
        timeout: 20000, // 20 seconds
        maxWait: 10000, // Wait max 10s to acquire transaction slot
      },
    );
  }

  return { enrolledUsers, skippedUsers };
};

const departmentEnrolledCourse = async (payload: IDepartmentEnrolledCourse) => {
  const { departmentId, courseId } = payload;

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: CoursesStatus.approved, isDeleted: false },
  });
  if (!course) throw new ApiError(httpStatus.BAD_REQUEST, 'Course not found!');

  const employees = await prisma.employee.findMany({
    where: { departmentId },
    include: { user: true },
  });
  if (!employees.length)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'No employees found in this department!',
    );

  const employeeIds = employees.map(emp => emp.userId);
  const existingEnrollments = await prisma.enrolledCourse.findMany({
    where: { courseId, userId: { in: employeeIds }, isDeleted: false },
  });

  const alreadyEnrolledIds = existingEnrollments.map(e => e.userId);
  const employeesToEnroll = employees.filter(
    emp => !alreadyEnrolledIds.includes(emp.userId),
  );

  const enrolledUsers: string[] = [];
  const skippedUsers = alreadyEnrolledIds;

  // ⚡ Run enrollments in parallel batches of 10 to prevent timeout
  const chunkSize = 10;
  for (let i = 0; i < employeesToEnroll.length; i += chunkSize) {
    const chunk = employeesToEnroll.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async emp => {
        const user = emp.user;
        await prisma.$transaction(async tx => {
          await enrollUser(tx, user, course);
          enrolledUsers.push(user.id);
        });
      }),
    );
  }

  return { enrolledUsers, skippedUsers };
};

const bulkInsertIntoDB = async (payload: IBulkEnrolledCourse) => {
  const { userId, courseIds } = payload;

  if (!Array.isArray(courseIds) || courseIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No course IDs provided!');
  }

  // Fetch user once
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });
  if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');

  const results = [];

  for (const courseId of courseIds) {
    try {
      // ✅ Reuse same single-course logic for each course
      const enrolled = await insertIntoDB({
        userId,
        courseId,
      } as IEnrolledCourse);
      results.push(enrolled);
    } catch (err: any) {
      console.log(`⚠️ Skipped CourseID ${courseId}: ${err.message}`);
    }
  }

  return results;
};

const enrollBundleCourses = async (payload: {
  userId: string;
  bundleId: string;
}) => {
  const { userId, bundleId } = payload;

  // 1️⃣ Fetch user
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    include: { student: true, employee: true },
  });
  if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');

  // 2️⃣ Fetch bundle and courses
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

  // 3️⃣ Fetch approved courses
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

  // 4️⃣ Filter out already enrolled courses
  const existingEnrollments = await prisma.enrolledCourse.findMany({
    where: { userId, courseId: { in: courseIds } },
    select: { courseId: true },
  });
  const alreadyEnrolledSet = new Set(existingEnrollments.map(e => e.courseId));
  const filteredCourses = courses.filter(c => !alreadyEnrolledSet.has(c.id));
  if (filteredCourses.length === 0) {
    return { success: false, message: 'All courses already enrolled' };
  }

  // 5️⃣ Transaction block
  const result = await prisma.$transaction(async tx => {
    // Enroll user in all filtered courses
    const enrollData = filteredCourses.map(c => ({
      userId,
      courseId: c.id,
      authorId: c.authorId,
      platform: c.platform,
      courseCategory: c.category,
    }));

    await tx.enrolledCourse.createMany({
      data: enrollData,
      skipDuplicates: true,
    });

    // Increment course counts for student or employee
    const incrementCount = filteredCourses.length;
    if (user.student) {
      await tx.student.update({
        where: { userId },
        data: { courseEnrolled: { increment: incrementCount } },
      });
    } else if (user.employee) {
      await tx.employee.update({
        where: { userId },
        data: { courseEnrolled: { increment: incrementCount } },
      });
    }

    // Update instructor / company / businessInstructor counts
    for (const c of filteredCourses) {
      if (c.platform === PlatformType.admin) {
        await tx.instructor.updateMany({
          where: { userId: c.authorId },
          data: { enrolled: { increment: 1 } },
        });
      } else if (c.platform === PlatformType.company && c.companyId) {
        await tx.businessInstructor.updateMany({
          where: { authorId: c.authorId, companyId: c.companyId },
          data: { enrolled: { increment: 1 } },
        });
        await tx.company.update({
          where: { id: c.companyId },
          data: { enrolled: { increment: 1 } },
        });
      }
    }

    // Increment bundle enrollment
    await tx.courseBundle.update({
      where: { id: bundleId },
      data: { enrollments: { increment: 1 } },
    });

    // 🧾 Create enrolled logs
    await tx.enrolledLogs.createMany({
      data: [
        // Logs for each enrolled course
        ...filteredCourses.map(c => ({
          userId,
          courseId: c.id,
          bundleId,
          modelType: EnrolledLogsModelType.course,
        })),
        // One log for the bundle itself
        {
          userId,
          bundleId,
          modelType: EnrolledLogsModelType.courseBundle,
        },
      ],
    });

    return { enrollCount: filteredCourses.length };
  });

  // 6️⃣ Auto-join all chats for each course
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
          data: { userId, chatId: chat.id, role: ChatRole.member },
        });
      }
    }

    // Send congratulatory email
    await sendCourseEnrollmentEmail(
      user.email,
      user.name,
      course.title,
      `https://dashboard.ensinor.com/courses/${course.id}`,
    );
  }

  // 7️⃣ Achievement bonus for paid bundle courses
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

    if (monthlyPurchases >= paidCourses.length) {
      const achievement = await prisma.achievement.upsert({
        where: { userId },
        update: {
          totalPoints: { increment: 50 },
          monthlyStreakPoints: { increment: 50 },
        },
        create: {
          userId,
          totalPoints: 50,
          monthlyStreakPoints: 50,
        },
      });

      for (const paid of paidCourses) {
        await prisma.achievementLogs.create({
          data: {
            userId,
            courseId: paid.id,
            modelType: AchievementModelType.monthly_streak,
          },
        });
      }

      const { level } = calculateAchievementLevel(achievement.totalPoints);
      await prisma.achievement.update({
        where: { userId },
        data: { level },
      });
    }
  }

  return result;
};

const bundleEnrollBundleCourses = async (payload: {
  userId: string;
  bundleIds: string[];
}) => {
  const { userId, bundleIds } = payload;

  if (!Array.isArray(bundleIds) || bundleIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'No bundle IDs provided!');
  }

  // ✅ Validate user
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
    include: { student: true, employee: true },
  });
  if (!user) throw new ApiError(httpStatus.BAD_REQUEST, 'User not found!');

  const allResults: any[] = [];

  // 🟢 Process each bundle independently
  for (const bundleId of bundleIds) {
    try {
      // 1️⃣ Fetch bundle + courses
      const bundle = await prisma.courseBundle.findFirst({
        where: { id: bundleId, isDeleted: false },
        include: {
          courseBundleCourses: { select: { courseId: true } },
        },
      });
      if (!bundle || bundle.courseBundleCourses.length === 0) {
        console.log(`⚠️ Skipping Bundle ${bundleId}: No valid courses`);
        continue;
      }

      const courseIds = bundle.courseBundleCourses.map(c => c.courseId);

      // 2️⃣ Fetch approved courses
      const courses = await prisma.course.findMany({
        where: {
          id: { in: courseIds },
          status: CoursesStatus.approved,
          isDeleted: false,
        },
      });

      if (courses.length === 0) continue;

      // 3️⃣ Filter out already enrolled
      const existingEnrollments = await prisma.enrolledCourse.findMany({
        where: { userId, courseId: { in: courseIds } },
        select: { courseId: true },
      });
      const alreadyEnrolledSet = new Set(
        existingEnrollments.map(e => e.courseId),
      );
      const filteredCourses = courses.filter(
        c => !alreadyEnrolledSet.has(c.id),
      );

      if (filteredCourses.length === 0) {
        console.log(`ℹ️ All courses already enrolled for bundle ${bundleId}`);
        continue;
      }

      // 4️⃣ Transactional insert
      const transactionResult = await prisma.$transaction(async tx => {
        // Create enrollments
        const enrollData = filteredCourses.map(c => ({
          userId,
          courseId: c.id,
          authorId: c.authorId,
          platform: c.platform,
          courseCategory: c.category,
        }));

        await tx.enrolledCourse.createMany({
          data: enrollData,
          skipDuplicates: true,
        });

        // Update counters
        const incrementCount = filteredCourses.length;
        if (user.student) {
          await tx.student.update({
            where: { userId },
            data: { courseEnrolled: { increment: incrementCount } },
          });
        } else if (user.employee) {
          await tx.employee.update({
            where: { userId },
            data: { courseEnrolled: { increment: incrementCount } },
          });
        }

        // Update instructor/company metrics
        for (const c of filteredCourses) {
          if (c.platform === PlatformType.admin) {
            await tx.instructor.updateMany({
              where: { userId: c.authorId },
              data: { enrolled: { increment: 1 } },
            });
          } else if (c.platform === PlatformType.company && c.companyId) {
            await tx.businessInstructor.updateMany({
              where: { authorId: c.authorId, companyId: c.companyId },
              data: { enrolled: { increment: 1 } },
            });
            await tx.company.update({
              where: { id: c.companyId },
              data: { enrolled: { increment: 1 } },
            });
          }
        }

        // Increment bundle enrollment count
        await tx.courseBundle.update({
          where: { id: bundleId },
          data: { enrollments: { increment: 1 } },
        });

        // 🧾 Logs for each course and bundle
        await tx.enrolledLogs.createMany({
          data: [
            ...filteredCourses.map(c => ({
              userId,
              courseId: c.id,
              bundleId,
              modelType: EnrolledLogsModelType.course,
            })),
            {
              userId,
              bundleId,
              modelType: EnrolledLogsModelType.courseBundle,
            },
          ],
        });

        return { enrolled: filteredCourses.length };
      });

      // 5️⃣ Chat auto-join + email
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
              data: { userId, chatId: chat.id, role: ChatRole.member },
            });
          }
        }

        // Email notification
        await sendCourseEnrollmentEmail(
          user.email,
          user.name,
          course.title,
          `https://dashboard.ensinor.com/courses/${course.id}`,
        );
      }

      // 6️⃣ Achievements (same as before)
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

        if (monthlyPurchases >= paidCourses.length) {
          const achievement = await prisma.achievement.upsert({
            where: { userId },
            update: {
              totalPoints: { increment: 50 },
              monthlyStreakPoints: { increment: 50 },
            },
            create: {
              userId,
              totalPoints: 50,
              monthlyStreakPoints: 50,
            },
          });

          for (const paid of paidCourses) {
            await prisma.achievementLogs.create({
              data: {
                userId,
                courseId: paid.id,
                modelType: AchievementModelType.monthly_streak,
              },
            });
          }

          const { level } = calculateAchievementLevel(achievement.totalPoints);
          await prisma.achievement.update({
            where: { userId },
            data: { level },
          });
        }
      }

      // Push bundle-level summary
      allResults.push({
        bundleId,
        enrolledCourses: filteredCourses.length,
        message: `✅ Enrolled in ${filteredCourses.length} courses from bundle ${bundleId}`,
      });
    } catch (err: any) {
      console.log(`❌ Error enrolling bundle ${bundleId}:`, err.message);
    }
  }

  return allResults;
};

const getEnrolledStudent = async (
  params: IEnrolledCourseFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.EnrolledCourseWhereInput[] = [
    { isDeleted: false },
  ];

  // 🔍 Optional search (by student name or email)
  if (searchTerm) {
    andConditions.push({
      user: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
    });
  }

  // 🧭 Filter conditions (like platform, etc.)
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.EnrolledCourseWhereInput = {
    AND: andConditions,
  };

  // 🧩 Step 1: Find all distinct userIds from enrolled courses
  const enrolledUsers = await prisma.enrolledCourse.findMany({
    where: whereConditions,
    distinct: ['userId'],
    select: {
      userId: true,
    },
    skip,
    take: limit,
  });

  const userIds = enrolledUsers.map(u => u.userId);

  if (userIds.length === 0) {
    return {
      meta: {
        page,
        limit,
        total: 0,
      },
      data: [],
    };
  }

  // 🧩 Step 2: Fetch user details for these enrolled users
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isDeleted: false,
    },
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      photoUrl: true,
      country: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  // 🧩 Step 3: Count total enrolled users for pagination
  const total = await prisma.enrolledCourse.groupBy({
    by: ['userId'],
    where: whereConditions,
    _count: { userId: true },
  });

  return {
    meta: {
      page,
      limit,
      total: total.length,
    },
    data: users,
  };
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
          hasCertificate: true,
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

const getStudentByAuthorCourse = async (
  params: IEnrolledCourseFilterRequest,
  options: IPaginationOptions,
  authorId?: string,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  // 🔹 Base filter conditions
  const andConditions: Prisma.EnrolledCourseWhereInput[] = [
    { authorId, isDeleted: false },
  ];

  // 🔹 Search filter (by user name or email)
  if (searchTerm) {
    andConditions.push({
      OR: [
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ],
    });
  }

  // 🔹 Dynamic filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: { equals: (filterData as any)[key] },
      })),
    });
  }

  const whereConditions: Prisma.EnrolledCourseWhereInput = {
    AND: andConditions,
  };

  // 🔹 Fetch all enrollments for this author
  const enrolledCourses = await prisma.enrolledCourse.findMany({
    where: whereConditions,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          photoUrl: true,
          country: true,
          city: true,
          role: true,
          student: {
            select: {
              courseEnrolled: true,
              courseCompleted: true,
            },
          },
          employee: {
            select: {
              courseEnrolled: true,
              courseCompleted: true,
            },
          },
        },
      },
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // 🔹 Group by unique user (student/employee)
  const studentMap = new Map<string, any>();

  for (const record of enrolledCourses) {
    const { user, completedRate, course, isComplete } = record;

    if (!studentMap.has(user.id)) {
      // Determine user type stats (student or employee)
      const userTypeData =
        user.role === 'employee' ? user.employee : user.student;

      studentMap.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        city: user.city,
        country: user.country,
        enrolledCourse: userTypeData?.courseEnrolled ?? 0,
        completedCourse: userTypeData?.courseCompleted ?? 0,
        totalCompletedRate: 0,
        totalCourses: 0,
        courses: [],
      });
    }

    const student = studentMap.get(user.id);
    student.totalCompletedRate += completedRate;
    student.totalCourses += 1;
    student.courses.push(course);

    // Optional: update completedCourse if tracked by isComplete flag
    if (isComplete) {
      student.completedCourse += 1;
    }
  }

  // 🔹 Format final response
  const students = Array.from(studentMap.values()).map(student => {
    const avgCompletedRate =
      student.totalCourses > 0
        ? Math.round(student.totalCompletedRate / student.totalCourses)
        : 0;

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      photoUrl: student.photoUrl,
      country: student.country,
      city: student.city,
      enrolledCourse: student.totalCourses,
      completedCourse: student.completedCourse,
      avgCompletedRate,
      enrolledCourses: student.courses,
    };
  });

  // 🔹 Manual pagination (since unique filtering is done in memory)
  const total = students.length;
  const paginated = students.slice(skip, skip + limit);

  return {
    meta: { page, limit, total },
    data: paginated,
  };
};

const getGradeLabel = (
  percent: number,
  grading: { gradeLabel: CourseGrade; minScore: number; maxScore: number }[],
) => {
  const grade = grading.find(
    g => percent >= g.minScore && percent <= g.maxScore,
  );
  return grade ? grade.gradeLabel : 'NA';
};

const myEnrolledCoursesGrade = async (userId: string) => {
  if (!userId) throw new Error('User ID is required');

  // --- Completed Courses ---
  const completedCourses = await prisma.enrolledCourse.findMany({
    where: { userId, isComplete: true, isDeleted: false },
    select: { courseId: true, courseMark: true, grade: true, authorId: true },
  });

  const completedCourseCount = completedCourses.length;

  // --- Quiz attempts ---
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: { userId, isCompleted: true, isDeleted: false },
    select: {
      id: true,
      quizId: true,
      marksObtained: true,
      totalMarks: true,
      grade: true,
    },
  });

  // --- Assignment submissions ---
  const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
    where: { userId, isDeleted: false },
    select: {
      id: true,
      assignmentId: true,
      marksObtained: true,
      totalMarks: true,
      grade: true,
    },
  });

  // --- Calculate total marks dynamically ---
  let totalObtained = 0;
  let totalPossible = 0;

  // ✅ Iterate through completed courses
  for (const c of completedCourses) {
    // Get all quizzes and assignments for this course
    const courseQuizzes = await prisma.quiz.findMany({
      where: { courseId: c.courseId, isDeleted: false },
      select: { id: true, marks: true },
    });

    const courseAssignments = await prisma.assignment.findMany({
      where: { courseId: c.courseId, isDeleted: false },
      select: { id: true, marks: true },
    });

    // Calculate total possible marks for this course
    const courseTotalMarks =
      courseQuizzes.reduce((sum, q) => sum + (q.marks || 0), 0) +
      courseAssignments.reduce((sum, a) => sum + (a.marks || 0), 0);

    // Aggregate student’s obtained marks for this course
    const courseQuizMarks = quizAttempts
      .filter(q => courseQuizzes.some(cq => cq.id === q.quizId))
      .reduce((sum, q) => sum + q.marksObtained, 0);

    const courseAssignmentMarks = assignmentSubmissions
      .filter(a => courseAssignments.some(ca => ca.id === a.assignmentId))
      .reduce((sum, a) => sum + a.marksObtained, 0);

    const courseObtained = courseQuizMarks + courseAssignmentMarks;

    totalObtained += courseObtained;
    totalPossible += courseTotalMarks;
  }

  // --- Handle edge cases (no data) ---
  const avgPercent =
    totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;

  // --- Fetch grading system dynamically ---
  let gradingSystemRecords = await prisma.gradingSystem.findMany({
    where: {
      OR: [
        { authorId: userId, isDeleted: false },
        { isDefault: true, isDeleted: false },
      ],
    },
    include: { grades: true },
  });

  let grading: {
    gradeLabel: CourseGrade;
    minScore: number;
    maxScore: number;
  }[] = [];

  if (gradingSystemRecords.length > 0) {
    const system =
      gradingSystemRecords.find(g => !g.isDefault) ||
      gradingSystemRecords.find(g => g.isDefault);
    grading =
      system?.grades.map(g => ({
        gradeLabel: g.gradeLabel as CourseGrade,
        minScore: g.minScore,
        maxScore: g.maxScore,
      })) || [];
  } else {
    grading = defaultGradingSystem as {
      gradeLabel: CourseGrade;
      minScore: number;
      maxScore: number;
    }[];
  }

  // --- Final computed results ---
  const overallGPA = parseFloat((avgPercent / 20).toFixed(2)); // Convert 0-100 to 0-5 scale
  const avgGrade = getGradeLabel(avgPercent, grading);
  const avgMarks = `${avgPercent.toFixed(2)}%`;

  return {
    overallGPA,
    avgGrade,
    avgMarks,
    completedCourse: completedCourseCount,
    totalObtained,
    totalPossible,
    quizAttempt: quizAttempts,
    myAssignment: assignmentSubmissions,
  };
};

const myEnrolledCoursesQuiz = async (userId: string) => {
  // 1️⃣ Get all enrolled courses for this user
  const enrolledCourses = await prisma.enrolledCourse.findMany({
    where: { userId, isDeleted: false },
    select: {
      courseId: true,
      course: {
        select: {
          id: true,
          title: true,
          thumbnail: true,
        },
      },
    },
  });

  // 2️⃣ Collect course IDs
  const courseIds = enrolledCourses.map(c => c.courseId);

  // 3️⃣ Get all quizzes (ordered by createdAt asc for serial_id)
  const quizzes = await prisma.quiz.findMany({
    where: { courseId: { in: courseIds }, isDeleted: false },
    include: {
      course: { select: { id: true, title: true, thumbnail: true } },
      author: { select: { id: true, name: true, email: true, photoUrl: true } },
      quizAttempt: {
        where: { userId, isDeleted: false },
        select: {
          id: true,
          marksObtained: true,
          timeTaken: true,
          isCompleted: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 4️⃣ Group quizzes by course
  const courseQuizMap: Record<string, any> = {};

  // helper: serial counter per course
  const courseSerialMap: Record<string, number> = {};

  for (const quiz of quizzes) {
    if (!courseQuizMap[quiz.courseId]) {
      courseQuizMap[quiz.courseId] = {
        courseId: quiz.course.id,
        courseTitle: quiz.course.title,
        thumbnail: quiz.course.thumbnail,
        quizzes: [],
      };
      courseSerialMap[quiz.courseId] = 0;
    }

    // increment serial_id based on createdAt
    courseSerialMap[quiz.courseId] += 1;
    const serial_id = courseSerialMap[quiz.courseId];

    // find attempt for this user
    const attempt = quiz.quizAttempt[0]; // user can have multiple attempts; can later sort by latest

    const status = attempt?.isCompleted ? 'completed' : 'incomplete';
    const marksObtained = attempt?.isCompleted ? attempt.marksObtained : null;
    const timeTaken = attempt?.isCompleted ? attempt.timeTaken : null;

    courseQuizMap[quiz.courseId].quizzes.push({
      quizId: quiz.id,
      serial_id,
      marks: quiz.marks,
      totalQuestions: quiz.questions,
      timeLimit: quiz.timeLimit,
      totalAttend: quiz.totalAttempt,
      status,
      marksObtained,
      timeTaken,
      author: quiz.author,
    });
  }

  // 5️⃣ Return formatted data
  return {
    totalQuizzes: quizzes.length,
    data: Object.values(courseQuizMap),
  };
};

const getByIdFromDB = async (id: string, userId: string) => {
  /* --------------------------------------------
     1️⃣ Fetch Enrolled Course
  --------------------------------------------- */
  const enrolledCourse = await prisma.enrolledCourse.findFirst({
    where: {
      id,
      userId,
      isDeleted: false,
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
      watchedLectures: {
        select: { id: true },
      },
      course: {
        include: {
          courseSections: {
            include: {
              courseContents: true,
            },
          },
          resource: true,
          quiz: {
            where: { isDeleted: false },
            include: {
              questionsList: {
                include: { options: true },
              },
            },
          },
          assignment: {
            where: { isDeleted: false },
          },
        },
      },
    },
  });

  if (!enrolledCourse) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Oops! Enrolled course not found!',
    );
  }

  /* --------------------------------------------
     2️⃣ Build Watched Lecture Lookup
  --------------------------------------------- */
  const watchedLectureSet = new Set(
    enrolledCourse.watchedLectures.map(l => l.id),
  );

  /* --------------------------------------------
     3️⃣ Fetch Completed Quiz Attempts
  --------------------------------------------- */
  const quizAttempts = await prisma.quizAttempt.findMany({
    where: {
      userId,
      quiz: {
        courseId: enrolledCourse.courseId,
      },
      isCompleted: true,
      isDeleted: false,
    },
    select: {
      quizId: true,
    },
  });

  const completedQuizSet = new Set(quizAttempts.map(attempt => attempt.quizId));

  /* --------------------------------------------
     4️⃣ Fetch Assignment Submissions
  --------------------------------------------- */
  const assignmentSubmissions = await prisma.assignmentSubmission.findMany({
    where: {
      userId,
      assignment: {
        courseId: enrolledCourse.courseId,
      },
      isDeleted: false,
    },
    select: {
      assignmentId: true,
    },
  });

  const completedAssignmentSet = new Set(
    assignmentSubmissions.map(sub => sub.assignmentId),
  );

  /* --------------------------------------------
     5️⃣ Inject isCompleted → Lessons
  --------------------------------------------- */
  const courseSectionsWithStatus = enrolledCourse.course.courseSections.map(
    section => ({
      ...section,
      courseContents: section.courseContents.map(content => ({
        ...content,
        isCompleted: watchedLectureSet.has(content.id),
      })),
    }),
  );

  /* --------------------------------------------
     6️⃣ Inject isCompleted → Quizzes
  --------------------------------------------- */
  const quizzesWithStatus = enrolledCourse.course.quiz.map(quiz => ({
    ...quiz,
    isCompleted: completedQuizSet.has(quiz.id),
  }));

  /* --------------------------------------------
     7️⃣ Inject isCompleted → Assignments
  --------------------------------------------- */
  const assignmentsWithStatus = enrolledCourse.course.assignment.map(
    assignment => ({
      ...assignment,
      isCompleted: completedAssignmentSet.has(assignment.id),
    }),
  );

  /* --------------------------------------------
     8️⃣ Calculate Overall Completion
  --------------------------------------------- */

  // 🔹 Lessons
  const totalLessons = enrolledCourse.course.courseSections.reduce(
    (sum, section) => sum + section.courseContents.length,
    0,
  );

  const completedLessons = enrolledCourse.watchedLectures.length;

  const isLessonCompleted =
    totalLessons === 0 || completedLessons === totalLessons;

  // 🔹 Quizzes
  const totalQuizzes = enrolledCourse.course.quiz.length;

  const completedQuizzes = quizzesWithStatus.filter(q => q.isCompleted).length;

  const isQuizCompleted =
    totalQuizzes === 0 || completedQuizzes === totalQuizzes;

  // 🔹 Assignments
  const totalAssignments = enrolledCourse.course.assignment.length;

  const completedAssignments = assignmentsWithStatus.filter(
    a => a.isCompleted,
  ).length;

  const isAssignmentCompleted =
    totalAssignments === 0 || completedAssignments === totalAssignments;

  // ✅ FINAL FLAG
  const isEntireCourseCompleted =
    isLessonCompleted && isQuizCompleted && isAssignmentCompleted;

  /* --------------------------------------------
     9️⃣ Final Response
  --------------------------------------------- */
  const { watchedLectures, ...rest } = enrolledCourse;

  return {
    ...rest,
    lectureWatched: completedLessons,
    isEntireCourseCompleted, // 👈 NEW FIELD
    course: {
      ...rest.course,
      courseSections: courseSectionsWithStatus,
      quiz: quizzesWithStatus,
      assignment: assignmentsWithStatus,
    },
  };
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

  // Fetch enrolled course + course content
  const enrolledCourse = await prisma.enrolledCourse.findUnique({
    where: { id: enrolledCourseId },
    include: {
      watchedLectures: true,
      course: {
        include: { courseSections: { include: { courseContents: true } } },
      },
      courseLogs: true,
    },
  });

  if (!enrolledCourse) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Enrolled course not found!');
  }

  // Fetch lecture info
  const lecture = await prisma.courseLesson.findUnique({
    where: { id: lectureId },
  });
  if (!lecture) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Lecture not found!');
  }

  const totalLectures = enrolledCourse.course.courseSections.reduce(
    (acc, section) => acc + section.courseContents.length,
    0,
  );

  const alreadyWatched = enrolledCourse.watchedLectures.some(
    l => l.id === lectureId,
  );

  // --- Update courseStartTime if first lecture watched ---
  const isFirstLecture = enrolledCourse.lectureWatched === 0;

  // --- Update learningTime and lectureWatched ---
  const updated = await prisma.enrolledCourse.update({
    where: { id: enrolledCourseId },
    data: {
      watchedLectures: alreadyWatched
        ? undefined
        : { connect: { id: lectureId } },
      lectureWatched: alreadyWatched ? undefined : { increment: 1 },
      learningTime: alreadyWatched
        ? undefined
        : { increment: Math.ceil(lecture.duration || 0) },
      lastActivity: new Date(),
      courseStartTime: isFirstLecture ? new Date() : undefined,
    },
  });

  // --- Log lecture watch every time ---
  await prisma.courseLogs.create({
    data: {
      userId: enrolledCourse.userId,
      courseId: enrolledCourse.courseId,
      enrolledId: enrolledCourseId,
    },
  });

  // --- Update completion percentage ---
  let completedRate = Math.floor(
    ((updated.lectureWatched + (alreadyWatched ? 0 : 1)) / totalLectures) * 100,
  );

  // Cap completedRate at 100% maximum
  if (completedRate > 100) completedRate = 100;

  // --- Mark course as complete and update courseFinishTime if all lectures watched ---
  let finalUpdate = updated;

  if (completedRate >= 100 && !updated.isComplete) {
    finalUpdate = await prisma.enrolledCourse.update({
      where: { id: enrolledCourseId },
      data: {
        completedRate,
      },
    });

    // TODO: Award points / notify author here
  } else {
    finalUpdate = await prisma.enrolledCourse.update({
      where: { id: enrolledCourseId },
      data: { completedRate },
    });
  }

  if (enrolledCourse.userId) {
    const awardedBadges = await checkAndAwardDailyLearningBadges(
      enrolledCourse.userId,
    );

    if (awardedBadges.length > 0)
      console.log(`Awarded daily badges: ${awardedBadges.join(', ')}`);
  }

  return finalUpdate;
};

const completeCourseIntoDB = async (id: string) => {
  const enrollCourse = await prisma.enrolledCourse.findUnique({
    where: { id, isDeleted: false },
    include: { user: true, course: true },
  });

  if (!enrollCourse)
    throw new ApiError(httpStatus.NOT_FOUND, 'Enrolled course not found!');

  const result = await prisma.enrolledCourse.update({
    where: { id },
    data: { isComplete: true, courseFinishTime: new Date() },
    include: { user: true, course: true },
  });

  if (result.isComplete && result.course?.authorId) {
    await sendCourseCompleteNotifYToAuthor(
      result.user,
      result.course,
      enrollCourse.authorId,
    );
  }

  const durationMins = result.learningTime ?? 0;
  const price = result.course?.price ?? 0;
  const userId = result.user.id;

  const achievement = await prisma.achievement.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  let awardedPoints = 0;

  if (price > 0) {
    awardedPoints = durationMins >= 600 || price >= 30 ? 200 : 100;

    await prisma.achievement.update({
      where: { id: achievement.id },
      data: {
        totalPoints: { increment: awardedPoints },
        paidCoursePoints: { increment: awardedPoints },
      },
    });
  } else {
    const remainingCap = 250 - achievement.freeCoursePoints;
    const pointsToAdd = Math.min(50, remainingCap > 0 ? remainingCap : 0);
    awardedPoints = pointsToAdd;

    if (pointsToAdd > 0) {
      await prisma.achievement.update({
        where: { id: achievement.id },
        data: {
          totalPoints: { increment: pointsToAdd },
          freeCoursePoints: { increment: pointsToAdd },
        },
      });
    }
  }

  await prisma.achievementLogs.create({
    data: {
      userId,
      courseId: result.course.id,
      modelType: AchievementModelType.course,
    },
  });

  const { level } = calculateAchievementLevel(
    achievement.totalPoints + awardedPoints,
  );
  await prisma.achievement.update({ where: { userId }, data: { level } });

  if (
    result.course.platform === PlatformType.company &&
    result.course.companyId
  ) {
    await prisma.company.update({
      where: { id: result.course.companyId },
      data: { completed: { increment: 1 } },
    });
  }

  const employee = await prisma.employee.findUnique({
    where: { userId },
  });
  if (employee) {
    await prisma.employee.update({
      where: { userId },
      data: { courseCompleted: { increment: 1 } },
    });
  } else {
    const student = await prisma.student.findUnique({ where: { userId } });
    if (student) {
      await prisma.student.update({
        where: { userId },
        data: { courseCompleted: { increment: 1 } },
      });
    }
  }

  // Checked all badges
  if (result.isComplete) {
    const awardedBadges = await checkAndAwardAllEligibleBadges(
      userId,
      result.course.id,
      enrollCourse.courseStartTime,
      durationMins,
    );

    if (awardedBadges.length > 0) {
      console.log(
        `Awarded ${awardedBadges.length} badges: ${awardedBadges.join(', ')}`,
      );
      // optional: ইউজারকে নোটিফাই করা
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
  groupEnrolledCourse,
  departmentEnrolledCourse,
  enrollBundleCourses,
  bulkInsertIntoDB,
  bundleEnrollBundleCourses,
  getEnrolledStudent,
  getAllFromDB,
  getStudentByAuthorCourse,
  myEnrolledCoursesQuiz,
  myEnrolledCoursesGrade,
  getByIdFromDB,
  updateIntoDB,
  watchLectureIntoDB,
  completeCourseIntoDB,
  deleteFromDB,
};
