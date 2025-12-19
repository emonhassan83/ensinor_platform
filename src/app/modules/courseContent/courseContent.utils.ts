import { Prisma, SubscriptionType } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';

const MB = 1;
const GB = 1024 * MB;

const INSTRUCTOR_STORAGE_LIMIT: Record<string, number> = {
  none: 500 * MB,
  basic: 500 * MB,
  standard: 5 * GB,
  premium: 10 * GB,
};

const COMPANY_STORAGE_LIMIT: Record<string, number> = {
  ngo: 10 * GB,
  sme: 20 * GB,
  enterprise: 50 * GB,
};

export const applyStorageUsage = async (
  tx: Prisma.TransactionClient,
  params: {
    authorId: string;
    courseId: string;
    fileStorage: number; // MB
  },
) => {
  const { authorId, courseId, fileStorage } = params;
  if (!fileStorage || fileStorage <= 0) return;

  const course = await tx.course.findUnique({
    where: { id: courseId },
    select: {
      platform: true,
      companyId: true,
    },
  });

  if (!course) return;

  /* ======================================================
     1️⃣ PLATFORM ADMIN / INSTRUCTOR
  ====================================================== */
  if (course.platform === 'admin' && !course.companyId) {
    const user = await tx.user.findUnique({
      where: { id: authorId },
      select: { storage: true },
    });

    if (!user) return;

    const subscription = await tx.subscription.findFirst({
      where: {
        userId: authorId,
        isExpired: false,
        isDeleted: false,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    const subType = subscription?.type ?? 'none';
    const limit =
      INSTRUCTOR_STORAGE_LIMIT[subType] ??
      INSTRUCTOR_STORAGE_LIMIT.none;

    if (user.storage + fileStorage > limit) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `Storage limit exceeded. Your plan allows ${limit} MB`,
      );
    }

    await tx.user.update({
      where: { id: authorId },
      data: {
        storage: { increment: fileStorage },
      },
    });

    return;
  }

  /* ======================================================
     2️⃣ COMPANY ADMIN / BUSINESS INSTRUCTOR
  ====================================================== */
  if (course.companyId) {
    const company = await tx.company.findUnique({
      where: { id: course.companyId },
      select: {
        storage: true,
        author: { select: { userId: true } },
      },
    });

    if (!company) return;

    const subscription = await tx.subscription.findFirst({
      where: {
        userId: company.author.userId,
        isExpired: false,
        isDeleted: false,
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Company has no active subscription',
      );
    }

    const limit = COMPANY_STORAGE_LIMIT[subscription.type];

    if (!limit) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Invalid company subscription',
      );
    }

    if (company.storage + fileStorage > limit) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `Company storage limit exceeded. Limit: ${limit} MB`,
      );
    }

    await tx.company.update({
      where: { id: course.companyId },
      data: {
        storage: { increment: fileStorage },
      },
    });
  }
};
