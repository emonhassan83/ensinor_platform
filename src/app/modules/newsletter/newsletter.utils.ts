import cron from 'node-cron';
import { addDays, addWeeks, addMonths } from 'date-fns';
import prisma from '../../utils/prisma';
import emailSender from '../../utils/emailSender';

// 🧭 Helper: Next schedule date
const getNextScheduleDate = (recurrence: string, currentDate: Date): Date | null => {
  switch (recurrence) {
    case 'daily':
      return addDays(currentDate, 1);
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'once':
      return null;
    default:
      return null;
  }
};

// 🕐 Runs every hour
cron.schedule('0 * * * *', async () => {
  console.log('🕐 Newsletter cron job running...');

  const now = new Date();

  // Find active subscribers whose scheduled time has arrived
  const subscribers = await prisma.newsletterSubscriber.findMany({
    where: {
      status: 'active',
      scheduleDate: { lte: now },
    },
  });

  for (const subscriber of subscribers) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // ✅ Count how many emails sent today
    const sentToday = await prisma.newsletterLog.count({
      where: {
        subscriberId: subscriber.id,
        sentAt: { gte: todayStart },
      },
    });

    if (sentToday >= 5) {
      console.log(`🚫 ${subscriber.email} already received 5 emails today.`);
      continue; // skip this subscriber
    }

    // Fetch relevant newsletters
    const newsletters = await prisma.newsletter.findMany({
      where: {
        category: { in: subscriber.category },
        scheduleDate: { lte: now },
      },
      take: Math.min(5 - sentToday, 5), // send only up to 5 emails max today
    });

    if (newsletters.length === 0) continue;

    for (const newsletter of newsletters) {
      await emailSender(
        subscriber.email,
        `📰 ${newsletter.title}`,
        `
        <div style="font-family:sans-serif;">
          <h2>${newsletter.title}</h2>
          <p>${newsletter.content}</p>
          <p style="color:gray;">Category: ${newsletter.category}</p>
        </div>
        `
      );

      // Log the sent email
      await prisma.newsletterLog.create({
        data: {
          subscriberId: subscriber.id,
          newsletterId: newsletter.id,
          sentAt: new Date(),
        },
      });

      console.log(`📬 Sent: ${newsletter.title} → ${subscriber.email}`);
    }

    // Update next schedule
    const nextSchedule = getNextScheduleDate(subscriber.recurrence, now);
    await prisma.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        lastSentAt: now,
        scheduleDate: nextSchedule ?? now,
        ...(subscriber.recurrence === 'once' && { status: 'paused' }),
      },
    });
  }

  console.log('✅ Newsletter cron job completed.');
});
