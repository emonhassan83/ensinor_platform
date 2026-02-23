import cron from 'node-cron';
import { addDays, addWeeks, addMonths } from 'date-fns';
import prisma from '../../utils/prisma';
import { sendEmail } from '../../utils/sendEmail';

// ----------------------------
// Helper: Next schedule date
// ----------------------------
const getNextScheduleDate = (
  recurrence: string,
  currentDate: Date,
): Date | null => {
  switch (recurrence) {
    case 'daily':
      return addDays(currentDate, 1);
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'monthly':
      return addMonths(currentDate, 1);
    default:
      return null;
  }
};

let isRunning = false;

export const newsletterScheduleCron = () => {
  cron.schedule('0 * * * *', async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // 1️⃣ Fetch subscribers once
      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: {
          status: 'active',
          scheduleDate: { lte: now },
        },
      });

      if (!subscribers.length) return;

      // 2️⃣ Preload all logs (single query)
      const logs = await prisma.newsletterLog.findMany({
        where: {
          subscriberId: { in: subscribers.map(s => s.id) },
          sentAt: { gte: todayStart },
        },
      });

      // 3️⃣ Group logs by subscriber
      const sentMap = new Map<string, string[]>();
      for (const log of logs) {
        if (!sentMap.has(log.subscriberId)) {
          sentMap.set(log.subscriberId, []);
        }
        sentMap.get(log.subscriberId)!.push(log.newsletterId);
      }

      for (const sub of subscribers) {
        const sentIds = sentMap.get(sub.id) ?? [];
        const sentToday = sentIds.length;

        if (sentToday >= 5) continue;

        // 4️⃣ Fetch newsletters once per subscriber
        const newsletters = await prisma.newsletter.findMany({
          where: {
            category: { in: sub.category },
            scheduleDate: { lte: now },
            id: { notIn: sentIds },
          },
          take: 5 - sentToday,
        });

        if (!newsletters.length) continue;

        // 5️⃣ Send emails concurrently (safe batch)
        await Promise.all(
          newsletters.map(n =>
            sendEmail({
              to: sub.email,
              subject: `📰 ${n.title}`,
              html: `<h2>${n.title}</h2><p>${n.content}</p>`,
              text: `📰 ${n.title}`,
            }),
          ),
        );

        // 6️⃣ Bulk insert logs
        await prisma.newsletterLog.createMany({
          data: newsletters.map(n => ({
            subscriberId: sub.id,
            newsletterId: n.id,
            sentAt: new Date(),
          })),
        });

        // 7️⃣ Update schedule once
        const nextSchedule = getNextScheduleDate(sub.recurrence, now);

        await prisma.newsletterSubscriber.update({
          where: { id: sub.id },
          data: {
            lastSentAt: now,
            scheduleDate: nextSchedule ?? now,
            ...(sub.recurrence === 'once' && { status: 'paused' }),
          },
        });
      }
    } catch (err) {
      console.error('Newsletter cron error:', err);
    } finally {
      isRunning = false;
    }
  });
};
