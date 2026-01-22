import { AchievementModelType, Course, NotificationModeType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';
import { findBatchIdByTitle, hasBatch } from '../../utils/batchUtils';
import prisma from '../../utils/prisma';

// Course Completed Notification → Admin
export const sendCourseCompleteNotifYToAuthor = async (
  user: Partial<User>,
  course: Partial<Course>,
  authorId: string,
) => {
  // Determine the message and description
  const message = messages.enrolledCourse.completed;
  const description = `${user?.name} has completed the course "${course.title}". Please review it.`;

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: authorId,
    message,
    description,
    modeType: NotificationModeType.enrolled_courses,
  });
};

export async function tryAwardScholarIfEligible(userId: string, triggerCourseId?: string): Promise<boolean> {
  const scholarId = await findBatchIdByTitle("Scholar");
  if (!scholarId) return false;

  const top10Count = await prisma.enrolledCourse.count({
    where: {
      userId,
      isComplete: true,
      isTop10: true,
      isDeleted: false,
    },
  });

  if (top10Count < 5) return false;

  const alreadyHas = await hasBatch(userId, scholarId);
  if (alreadyHas) return false;

  await prisma.achievement.update({
    where: { userId },
    data: { badges: { connect: { id: scholarId } } },
  });

  await prisma.achievementLogs.create({
    data: {
      userId,
      badgeId: scholarId,
      modelType: AchievementModelType.badges
    },
  });

  return true;
}

/**
 * চেক করে যে ইউজারের মোট learning time 100 hours (6000 minutes) পূরণ হয়েছে কিনা
 * এবং Time Master ব্যাজ দেওয়া যায় কিনা
 */
export async function tryAwardTimeMasterIfEligible(userId: string): Promise<boolean> {
  const TIME_MASTER_TITLE = "Time Master";
  const REQUIRED_MINUTES = 6000; // 100 hours × 60 minutes

  // ১. Time Master ব্যাজের ID খোঁজা
  const timeMasterId = await findBatchIdByTitle(TIME_MASTER_TITLE);
  if (!timeMasterId) {
    console.warn(`Batch "${TIME_MASTER_TITLE}" not found`);
    return false;
  }

  // ২. ইতিমধ্যে এই ব্যাজ আছে কিনা
  const alreadyHas = await hasBatch(userId, timeMasterId);
  if (alreadyHas) return false;

  // ৩. ইউজারের সব enrolled course এর learningTime যোগ করা
  const totalMinutes = await prisma.enrolledCourse.aggregate({
    where: {
      userId,
      isComplete: true,
      isDeleted: false,
    },
    _sum: {
      learningTime: true,
    },
  });

  const totalLearningMinutes = totalMinutes._sum.learningTime ?? 0;

  // ৪. যদি ১০০ ঘণ্টা পূরণ না হয় → false
  if (totalLearningMinutes < REQUIRED_MINUTES) {
    return false;
  }

  // ৫. ব্যাজ দেওয়া
  await prisma.achievement.update({
    where: { userId },
    data: {
      badges: {
        connect: { id: timeMasterId },
      },
    },
  });

  // ৬. লগ রাখা
  await prisma.achievementLogs.create({
    data: {
      userId,
      badgeId: timeMasterId,
      modelType: AchievementModelType.badges
    },
  });

  console.log(`Time Master badge awarded to user ${userId} (${totalLearningMinutes} minutes)`);
  return true;
}