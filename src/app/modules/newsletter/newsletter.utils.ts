import cron from 'node-cron';
import { addDays, addWeeks, addMonths } from 'date-fns';
import prisma from '../../utils/prisma';
import emailSender from '../../utils/emailSender';

// 🧭 Helper: Next schedule date
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
    case 'once':
      return null;
    default:
      return null;
  }
};

// ⏰ Run every hour, at the start of the hours
let isRunning = false;
export const newsletterScheduleCorn = () => {
  cron.schedule('0 * * * *', async () => {
    if (isRunning) {
      console.log(
        '⚠️ Newsletter job skipped — previous run still in progress.',
      );
      return;
    }

    isRunning = true;
    console.log('🕐 Newsletter cron job running...');

    try {
      const now = new Date();

      const subscribers = await prisma.newsletterSubscriber.findMany({
        where: {
          status: 'active',
          scheduleDate: { lte: now },
        },
      });

      for (const subscriber of subscribers) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Count how many emails sent today
        const sentToday = await prisma.newsletterLog.count({
          where: {
            subscriberId: subscriber.id,
            sentAt: { gte: todayStart },
          },
        });

        // Max 5 emails per day
        if (sentToday >= 5) {
          console.log(`🚫 ${subscriber.email} reached daily limit (5 emails).`);
          continue;
        }

        // ✅ Get already-sent newsletter IDs for this subscriber
        const sentNewsletterIds = await prisma.newsletterLog.findMany({
          where: { subscriberId: subscriber.id },
          select: { newsletterId: true },
        });

        const alreadySentIds = sentNewsletterIds.map(n => n.newsletterId);

        // ✅ Fetch only newsletters NOT already sent to this subscriber
        const newsletters = await prisma.newsletter.findMany({
          where: {
            category: { in: subscriber.category },
            scheduleDate: { lte: now },
            id: { notIn: alreadySentIds }, // 🚀 Prevent duplicates
          },
          take: Math.min(5 - sentToday, 5),
        });

        if (newsletters.length === 0) {
          console.log(`ℹ️ No new newsletters for ${subscriber.email}.`);
          continue;
        }

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
            `,
          );

          // Log each send
          await prisma.newsletterLog.create({
            data: {
              subscriberId: subscriber.id,
              newsletterId: newsletter.id,
              sentAt: new Date(),
            },
          });

          console.log(`📬 Sent: ${newsletter.title} → ${subscriber.email}`);
        }

        // ✅ Recount after sending; if daily cap reached, update schedule
        const totalSentNow = await prisma.newsletterLog.count({
          where: {
            subscriberId: subscriber.id,
            sentAt: { gte: todayStart },
          },
        });

        if (totalSentNow >= 5) {
          const nextSchedule = getNextScheduleDate(subscriber.recurrence, now);
          await prisma.newsletterSubscriber.update({
            where: { id: subscriber.id },
            data: {
              lastSentAt: now,
              scheduleDate: nextSchedule ?? now,
              ...(subscriber.recurrence === 'once' && { status: 'paused' }),
            },
          });
          console.log(`🔁 Updated next schedule for ${subscriber.email}`);
        }
      }

      console.log('✅ Newsletter cron job completed.');
    } catch (err) {
      console.error('🚨 Newsletter cron job error:', err);
    } finally {
      isRunning = false;
    }
  });
};
