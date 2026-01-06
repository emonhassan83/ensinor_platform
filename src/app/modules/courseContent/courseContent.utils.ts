import { Prisma } from '@prisma/client';
import httpStatus from 'http-status';
import ApiError from '../../errors/ApiError';

export const MB = 1;
export const GB = 1024 * MB;

export const INSTRUCTOR_STORAGE_LIMIT: Record<string, number> = {
  none: 500 * MB,
  basic: 500 * MB,
  standard: 5 * GB,
  premium: 10 * GB,
};

export const COMPANY_STORAGE_LIMIT: Record<string, number> = {
  ngo: 10 * GB,
  sme: 20 * GB,
  enterprise: 50 * GB,
};

/* =========================================================
   1️⃣ VALIDATE STORAGE QUOTA (BEFORE WRITE)
========================================================= */
export const validateStorageQuota = async (
  tx: Prisma.TransactionClient,
  params: {
    authorId: string;
    courseId: string;
    incomingStorage: number;
  },
) => {
  const { authorId, courseId, incomingStorage } = params;
  if (!incomingStorage || incomingStorage <= 0) return;

  const course = await tx.course.findUnique({
    where: { id: courseId },
    select: { platform: true, companyId: true },
  });

  if (!course) return;

  /* =======================
     INSTRUCTOR (ADMIN)
  ======================= */
  if (course.platform === 'admin' && !course.companyId) {
    const user = await tx.user.findUnique({
      where: { id: authorId },
      select: { storage: true },
    });
    if (!user) return;

    const subscription = await tx.subscription.findFirst({
      where: {
        userId: authorId,
        status: 'active',
        isDeleted: false,
        isExpired: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const subType = subscription?.type ?? 'none';
    const limit =
      INSTRUCTOR_STORAGE_LIMIT[subType] ??
      INSTRUCTOR_STORAGE_LIMIT.none;

    if (user.storage + incomingStorage > limit) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `Storage exceeded. Available: ${limit - user.storage} MB`,
      );
    }
  }

  /* =======================
     COMPANY
  ======================= */
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
        status: 'active',
        isDeleted: false,
        isExpired: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const limit = COMPANY_STORAGE_LIMIT[subscription?.type ?? 'ngo'];
    if (!limit) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'Invalid company subscription',
      );
    }

    if (company.storage + incomingStorage > limit) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `Company storage exceeded. Available: ${
          limit - company.storage
        } MB`,
      );
    }
  }
};

/* =========================================================
   2️⃣ APPLY STORAGE USAGE (AFTER VALIDATION)
========================================================= */
export const applyStorageUsage = async (
  tx: Prisma.TransactionClient,
  params: {
    authorId: string;
    courseId: string;
    fileStorage: number;
  },
) => {
  const { authorId, courseId, fileStorage } = params;
  if (!fileStorage || fileStorage <= 0) return;

  const course = await tx.course.findUnique({
    where: { id: courseId },
    select: { platform: true, companyId: true },
  });
  if (!course) return;

  if (course.platform === 'admin' && !course.companyId) {
    await tx.user.update({
      where: { id: authorId },
      data: { storage: { increment: fileStorage } },
    });
    return;
  }

  if (course.companyId) {
    await tx.company.update({
      where: { id: course.companyId },
      data: { storage: { increment: fileStorage } },
    });
  }
};

