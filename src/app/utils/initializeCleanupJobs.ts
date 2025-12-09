import cron from "node-cron";
import prisma from "./prisma";

// ---------------------------
// Centralized Logging Helper
// ---------------------------
const log = (label: string, message: string) => {
  console.log(`[${label}] ${message}`);
};

// ---------------------------
// 1) Cleanup Expired Users
// ---------------------------
const cleanupExpiredUsers = async () => {
  const now = new Date();
  log("USER-CLEANUP", "Scanning for expired users...");

  const expiredUsers = await prisma.user.findMany({
    where: {
      expireAt: { lte: now },
      verification: { status: false },
    },
    select: { id: true, role: true },
  });

  if (expiredUsers.length === 0) {
    return log("USER-CLEANUP", "No expired users found.");
  }

  log("USER-CLEANUP", `Found ${expiredUsers.length} expired users.`);

  await prisma.$transaction(async (tx) => {
    for (const usr of expiredUsers) {
      if (usr.role === "student") {
        await tx.student.deleteMany({ where: { userId: usr.id } });
      }
      await tx.user.delete({ where: { id: usr.id } });
    }
  });

  log("USER-CLEANUP", "Expired user cleanup completed successfully.");
};

// ---------------------------
// 2) Cleanup Unpublished Courses
// ---------------------------
const cleanupUnpublishedCourses = async () => {
  log("COURSE-CLEANUP", "Checking for unpublished courses...");

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const result = await prisma.course.updateMany({
    where: {
      isPublished: false,
      isDeleted: false,
      createdAt: { lte: twelveHoursAgo },
    },
    data: { isDeleted: true },
  });

  log(
    "COURSE-CLEANUP",
    `Soft-deleted ${result.count} unpublished courses.`
  );
};

// ---------------------------
// 3) Cleanup Coupons & Promo Codes
// ---------------------------
const cleanupCouponsAndPromos = async () => {
  const now = new Date();
  log("COUPON-CLEANUP", "Running daily coupon/promo cleanup...");

  const deletedCoupons = await prisma.coupon.deleteMany({
    where: {
      OR: [{ isActive: false }, { expireAt: { lt: now } }],
    },
  });

  const deletedPromos = await prisma.promoCode.deleteMany({
    where: {
      OR: [{ isActive: false }, { expireAt: { lt: now } }],
    },
  });

  log(
    "COUPON-CLEANUP",
    `Deleted ${deletedCoupons.count} coupons & ${deletedPromos.count} promo codes.`
  );
};

// ---------------------------
// MASTER SCHEDULER
// ---------------------------
export const initializeCleanupJobs = () => {
  log("CRON", "Initializing scheduled maintenance tasks...");

  // Every 12 hours → expired users & unpublished courses
  cron.schedule("0 */12 * * *", async () => {
    try {
      log("CRON", "Running 12-hour maintenance tasks...");
      await cleanupExpiredUsers();
      await cleanupUnpublishedCourses();
    } catch (err) {
      console.error("CRON ERROR (12-hour tasks):", err);
    }
  });

  // Every day at 2 AM → coupons & promo codes
  cron.schedule("0 2 * * *", async () => {
    try {
      await cleanupCouponsAndPromos();
    } catch (err) {
      console.error("CRON ERROR (coupon cleanup):", err);
    }
  });

  log("CRON", "All scheduled jobs are active.");
};
