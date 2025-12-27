import cron from 'node-cron';
import prisma from './prisma';

const log = (tag: string, msg: string) =>
  console.log(`[${tag}] ${msg}`);

// ---------------------------
// 1️⃣ Expired Users Cleanup
// ---------------------------
const cleanupExpiredUsers = async () => {
  const now = new Date();

  const expiredUserIds = await prisma.user.findMany({
    where: {
      expireAt: { lte: now },
      verification: { status: false },
    },
    select: { id: true },
  });

  if (!expiredUserIds.length) return;

  const ids = expiredUserIds.map(u => u.id);

  await prisma.$transaction([
    prisma.student.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);

  log('USER-CLEANUP', `Deleted ${ids.length} expired users`);
};

// ---------------------------
// 2️⃣ Unpublished Course Cleanup
// ---------------------------
const cleanupUnpublishedCourses = async () => {
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

  const res = await prisma.course.updateMany({
    where: {
      isPublished: false,
      isDeleted: false,
      createdAt: { lte: twelveHoursAgo },
    },
    data: { isDeleted: true },
  });

  log('COURSE-CLEANUP', `Soft deleted ${res.count} courses`);
};

// ---------------------------
// 3️⃣ Coupon Cleanup
// ---------------------------
const cleanupCouponsAndPromos = async () => {
  const now = new Date();

  await prisma.$transaction([
    prisma.coupon.deleteMany({
      where: { OR: [{ isActive: false }, { expireAt: { lt: now } }] },
    }),
    prisma.promoCode.deleteMany({
      where: { OR: [{ isActive: false }, { expireAt: { lt: now } }] },
    }),
  ]);

  log('COUPON', 'Coupons & promos cleaned');
};

// ---------------------------
// MASTER CRON
// ---------------------------
export const initializeCleanupJobs = () => {
  cron.schedule('0 */12 * * *', async () => {
    await cleanupExpiredUsers();
    await cleanupUnpublishedCourses();
  });

  cron.schedule('0 2 * * *', cleanupCouponsAndPromos);
};
