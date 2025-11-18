import { UserRole, UserStatus, AchievementModelType } from '@prisma/client';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';
import { getLevelProgress } from '../../utils/achievementLevel';

const myAchievementsIntoDB = async (userId: string) => {
  // 1️⃣ Validate user
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // 2️⃣ Fetch Achievement details
  const achievement = await prisma.achievement.findUnique({
    where: { userId },
  });

  // 3️⃣ Calculate level & progress
  const levelInfo = getLevelProgress(achievement?.totalPoints ?? 0);

  // 4️⃣ Count completed courses
  const completedCourses = await prisma.enrolledCourse.count({
    where: {
      userId,
      isDeleted: false,
      isComplete: true,
    },
  });

  // 5️⃣ Count earned certificates
  const certificateCount = await prisma.certificate.count({
    where: { userId },
  });

  // 6️⃣ Calculate streak days (based on unique `courseLogs` days)
  const courseLogs = await prisma.courseLogs.findMany({
    where: { userId },
    select: { createdAt: true },
  });

  const uniqueDays = new Set(
    courseLogs.map(log => log.createdAt.toISOString().split('T')[0]),
  );
  const daysStreak = uniqueDays.size;

  // 7️⃣ Fetch Achievement Logs
  const achievementLogs = await prisma.achievementLogs.findMany({
    where: { userId },
    include: {
      course: { select: { id: true, title: true } },
      badge: { select: { id: true, title: true, logo: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 8️⃣ Build Response
  const data = {
    pointsAchievements: {
      totalPoints: achievement?.totalPoints ?? 0,
      paidCoursePoints: achievement?.paidCoursePoints ?? 0,
      freeCoursePoints: achievement?.freeCoursePoints ?? 0,
      monthlyStreakPoints: achievement?.monthlyStreakPoints ?? 0,
      level: levelInfo.level ?? 0,
      nextLevelProgress: levelInfo.nextLevelProgress,
    },
    overallAchievements: {
      courseCompleted: completedCourses,
      certificateEarned: certificateCount,
      daysStreak: daysStreak,
    },
    achievementsLogs: achievementLogs,
  };

  return data;
};

const earnBadgesIntoDB = async (userId: string) => {
  // Validate user exists and is active
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Fetch user's achievements and earned badges
  const achievement = await prisma.achievement.findUnique({
    where: { userId },
    include: {
      badges: {
        where: { isDeleted: false },
        select: {
          id: true,
          title: true,
          description: true,
          logo: true,
          category: true,
          rarity: true,
          popularity: true,
          createdAt: true,
        },
      },
    },
  });

  if (!achievement) return [];

  return achievement.badges;
};

const availableBadgesIntoDB = async (userId: string) => {
  // Ensure user exists
  const user = await prisma.user.findFirst({
    where: { id: userId, status: UserStatus.active, isDeleted: false },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found!');
  }

  // Fetch achievement with earned badge IDs
  const achievement = await prisma.achievement.findUnique({
    where: { userId },
    include: { badges: { select: { id: true } } },
  });

  const earnedBadgeIds = achievement?.badges?.map(b => b.id) ?? [];

  // Fetch badges not yet earned
  const availableBadges = await prisma.batch.findMany({
    where: {
      isDeleted: false,
      id: { notIn: earnedBadgeIds },
    },
    select: {
      id: true,
      title: true,
      description: true,
      logo: true,
      category: true,
      rarity: true,
      popularity: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return availableBadges;
};

const assignBadgesIntoDB = async (
  badgeId: string, // Batch ID
  payload: { userId: string },
) => {
  const { userId } = payload;

  // 1️⃣ Validate: Badge exists
  const badge = await prisma.batch.findFirst({
    where: { id: badgeId, isDeleted: false },
  });

  if (!badge) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Badge not found!');
  }

  // 2️⃣ Validate: Student user exists
  const student = await prisma.user.findFirst({
    where: { id: userId, role: UserRole.student, isDeleted: false },
  });

  if (!student) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Student not found!');
  }

  // 4️⃣ Ensure Achievement record exists for student
  let achievement = await prisma.achievement.findUnique({
    where: { userId: userId },
    include: { badges: true },
  });

  if (!achievement) {
    achievement = await prisma.achievement.create({
      data: { userId },
      include: { badges: true },
    });
  }

  // 5️⃣ Validation: Prevent duplicate badge assignment
  const alreadyAssigned = achievement.badges.some(b => b.id === badgeId);
  if (alreadyAssigned) {
    throw new ApiError(
      httpStatus.CONFLICT,
      'This badge is already assigned to the student!',
    );
  }

  // 6️⃣ Assign badge via relation
  await prisma.achievement.update({
    where: { userId },
    data: {
      badges: {
        connect: { id: badgeId },
      },
    },
  });

  // 7️⃣ (Optional) Log the action in AchievementLogs
  await prisma.achievementLogs.create({
    data: {
      userId,
      badgeId: badgeId,
      modelType: AchievementModelType.badges,
    },
  });

  return achievement;
};

export const ReportsService = {
  myAchievementsIntoDB,
  earnBadgesIntoDB,
  availableBadgesIntoDB,
  assignBadgesIntoDB,
};
