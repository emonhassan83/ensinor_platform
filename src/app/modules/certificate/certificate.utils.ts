import {
  AchievementModelType,
  Certificate,
  NotificationModeType,
  User,
} from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';
import prisma from '../../utils/prisma';
import { findBatchIdByTitle, hasBatch } from '../../utils/batchUtils';

/**
 * Find Certificate Collector badges
 */
export async function tryAwardCertificateCollectorIfEligible(
  userId: string,
): Promise<boolean> {
  const CERTIFICATE_COLLECTOR_TITLE = 'Certificate Collector';
  const REQUIRED_CERTIFICATES = 5;

  // ১. find badges
  const badgeId = await findBatchIdByTitle(CERTIFICATE_COLLECTOR_TITLE);
  if (!badgeId) {
    return false
  }

  // ২. if exists badges
  const alreadyHas = await hasBatch(userId, badgeId);
  if (alreadyHas) return false;

  // ৩. total certificate count
  const certificateCount = await prisma.certificate.count({
    where: {
      userId,
    },
  });

  if (certificateCount < REQUIRED_CERTIFICATES) {
    return false;
  }

  // ৪. ব্যাজ দেওয়া
  await prisma.achievement.update({
    where: { userId },
    data: {
      badges: {
        connect: { id: badgeId },
      },
    },
  });

  // ৫. লগ রাখা
  await prisma.achievementLogs.create({
    data: {
      userId,
      badgeId,
      modelType: AchievementModelType.badges,
    },
  });

  return true;
}

export const sendCertificateNotifyToUser = async (
  user: Partial<User>, // course instructor
  certificate: Partial<Certificate>,
) => {
  const message = messages.certificate.completed;
  const description = `Hi ${user.name}, your certificate for "${certificate.courseName}" has been successfully completed and is now available.`;

  await NotificationService.createNotificationIntoDB({
    receiverId: user.id!,
    message,
    description,
    referenceId: certificate.id,
    modeType: NotificationModeType.certificate,
  });
};
