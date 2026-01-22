import { AchievementModelType } from "@prisma/client";
import { findBatchIdByTitle, hasBatch } from "../../utils/batchUtils";
import prisma from "../../utils/prisma";

/**
 * Here quiz related all badges here
 */
export async function checkAndAwardQuizBadges(
  userId: string,
  quizId: string,
  attemptId: string
): Promise<string[]> {
  const awarded: string[] = [];

  // ১. Learning Resilience
  const RESILIENCE_TITLE = "Learning Resilience";

  const resilienceBadgeId = await findBatchIdByTitle(RESILIENCE_TITLE);
  if (resilienceBadgeId && !(await hasBatch(userId, resilienceBadgeId))) {
    const previousAttempts = await prisma.quizAttempt.findMany({
      where: {
        userId,
        quizId,
        isCompleted: true,
        isDeleted: false,
        id: { not: attemptId },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (previousAttempts.length > 0) {
      const prevAttempt = previousAttempts[0];
      const currentAttempt = await prisma.quizAttempt.findUnique({
        where: { id: attemptId },
        select: { correctRate: true },
      });

      if (currentAttempt && prevAttempt.correctRate !== null) {
        const improvement = currentAttempt.correctRate - prevAttempt.correctRate;
        if (improvement >= 50) {
          await prisma.achievement.update({
            where: { userId },
            data: { badges: { connect: { id: resilienceBadgeId } } },
          });

          await prisma.achievementLogs.create({
            data: {
              userId,
              badgeId: resilienceBadgeId,
              modelType: AchievementModelType.badges
            },
          });

          awarded.push(RESILIENCE_TITLE);
        }
      }
    }
  }

  // ২. Perfect Score
  const PERFECT_TITLE = "Perfect Score";
  const PERFECT_REQUIRED = 3;

  const perfectBadgeId = await findBatchIdByTitle(PERFECT_TITLE);
  if (perfectBadgeId && !(await hasBatch(userId, perfectBadgeId))) {
    const perfectCount = await prisma.quizAttempt.count({
      where: {
        userId,
        isCompleted: true,
        isDeleted: false,
        correctRate: 100,
      },
    });

    if (perfectCount >= PERFECT_REQUIRED) {
      await prisma.achievement.update({
        where: { userId },
        data: { badges: { connect: { id: perfectBadgeId } } },
      });

      await prisma.achievementLogs.create({
        data: {
          userId,
          badgeId: perfectBadgeId,
          modelType: AchievementModelType.badges
        },
      });

      awarded.push(PERFECT_TITLE);
    }
  }

  // ৩. First Pass Mastery
  const FIRST_PASS_TITLE = "First Pass Mastery";
  const FIRST_PASS_REQUIRED = 5;

  const firstPassBadgeId = await findBatchIdByTitle(FIRST_PASS_TITLE);
  if (firstPassBadgeId && !(await hasBatch(userId, firstPassBadgeId))) {
    const firstPassCount = await prisma.quizAttempt.count({
      where: {
        userId,
        isCompleted: true,
        isDeleted: false,
        attemptNumber: 1,
        correctRate: 100,
      },
    });

    if (firstPassCount >= FIRST_PASS_REQUIRED) {
      await prisma.achievement.update({
        where: { userId },
        data: { badges: { connect: { id: firstPassBadgeId } } },
      });

      await prisma.achievementLogs.create({
        data: {
          userId,
          badgeId: firstPassBadgeId,
          modelType: AchievementModelType.badges
        },
      });

      awarded.push(FIRST_PASS_TITLE);
    }
  }

  // ৪. Quiz Master
  const QUIZ_MASTER_TITLE = "Quiz Master";
  const QUIZ_MASTER_REQUIRED = 10;
  const MIN_SCORE = 90;

  const quizMasterBadgeId = await findBatchIdByTitle(QUIZ_MASTER_TITLE);
  if (quizMasterBadgeId && !(await hasBatch(userId, quizMasterBadgeId))) {
    const highScoreCount = await prisma.quizAttempt.count({
      where: {
        userId,
        isCompleted: true,
        isDeleted: false,
        correctRate: { gte: MIN_SCORE },
      },
    });

    if (highScoreCount >= QUIZ_MASTER_REQUIRED) {
      await prisma.achievement.update({
        where: { userId },
        data: { badges: { connect: { id: quizMasterBadgeId } } },
      });

      await prisma.achievementLogs.create({
        data: {
          userId,
          badgeId: quizMasterBadgeId,
          modelType: AchievementModelType.badges
        },
      });

      awarded.push(QUIZ_MASTER_TITLE);
    }
  }

  return awarded;
}