import cron from 'node-cron';
import prisma from './prisma';

export const scheduleExpiredUserCleanup = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();

    await prisma.user.deleteMany({
      where: {
        expireAt: { lte: now }, // time expired
        verification: {
          status: false, // still not verified
        },
      },
    });
  });
};