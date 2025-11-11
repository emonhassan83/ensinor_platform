import cron from 'node-cron';
import prisma from './prisma';

export const scheduleExpiredUserCleanup = () => {
  // Run every 12 hours (at minute 0)
  cron.schedule('0 */12 * * *', async () => {
    const now = new Date();

    // Fetch users that should be deleted
    const expiredUsers = await prisma.user.findMany({
      where: {
        expireAt: { lte: now },
        verification: { status: false },
      },
      select: { id: true, role: true },
    });

    if (expiredUsers.length === 0) return;

    console.log(`🧹 Cleaning up ${expiredUsers.length} expired users...`);

    await prisma.$transaction(async tx => {
      for (const user of expiredUsers) {
        // If user is a student → delete related Student table record
        if (user.role === 'student') {
          await tx.student.deleteMany({
            where: { userId: user.id },
          });
        }

        // Finally delete the user itself
        await tx.user.delete({
          where: { id: user.id },
        });
      }
    });

    console.log(`✅ Expired users cleanup completed successfully at ${now.toISOString()}`);
  });
};
