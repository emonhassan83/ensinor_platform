import {
  AchievementModelType,
  Course,
  NotificationModeType,
  User,
} from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';
import { findBatchIdByTitle, hasBatch } from '../../utils/batchUtils';
import prisma from '../../utils/prisma';

type BadgeRule = {
  title: string;
  type:
    | 'count'
    | 'unique_category'
    | 'total_courses'
    | 'time_hours'
    | 'first_course_fast'
    | 'single_course_fast'
    | 'path';
  required: number | string;
  categoryFilter?: string;
  descriptionTemplate: string;
  extraCheck?: (userId: string) => Promise<boolean>;
};

/**
 * If course completed then awards all badges
 */
export async function checkAndAwardAllEligibleBadges(
  userId: string,
  triggerCourseId?: string,
  triggerCourseStartTime?: Date,
  triggerDurationMins?: number,
): Promise<string[]> {
  const awarded: string[] = [];

  const rules: BadgeRule[] = [
    {
      title: 'Scholar',
      type: 'count',
      required: 5,
      categoryFilter: 'top10',
      descriptionTemplate: 'Top 10% in 5 courses',
    },
    {
      title: 'Time Master',
      type: 'time_hours',
      required: 100,
      descriptionTemplate: 'Completed 100 hours of learning',
    },
    {
      title: 'Knowledge Seeker',
      type: 'unique_category',
      required: 5,
      descriptionTemplate: 'Completed courses in 5 different categories',
    },
    {
      title: 'Innovation Leader',
      type: 'count',
      required: 5,
      categoryFilter: 'innovation',
      descriptionTemplate: 'Completed 5 innovation courses',
    },
    {
      title: 'Change Architect',
      type: 'count',
      required: 3,
      categoryFilter: 'innovation',
      descriptionTemplate: 'Completed 3 innovation courses',
    },
    {
      title: 'Communication',
      type: 'count',
      required: 5,
      categoryFilter: 'communication',
      descriptionTemplate: 'Completed 5 communication courses',
    },
    {
      title: 'Project Management',
      type: 'count',
      required: 5,
      categoryFilter: 'project management',
      descriptionTemplate: 'Completed 5 project management courses',
    },
    {
      title: 'Leadership',
      type: 'count',
      required: 5,
      categoryFilter: 'leadership',
      descriptionTemplate: 'Completed 5 leadership courses',
    },
    {
      title: 'Mentor',
      type: 'count',
      required: 5,
      categoryFilter: 'human resource',
      descriptionTemplate: 'Completed 5 human resource courses',
    },
    {
      title: 'Polyglot',
      type: 'unique_category',
      required: 3,
      categoryFilter: 'programming',
      descriptionTemplate:
        'Completed courses in 3 different programming languages',
    },

    // Path-based
    {
      title: 'Cybersecurity Expert',
      type: 'path',
      required: 'cybersecurity',
      descriptionTemplate: 'Completed Cybersecurity path',
    },
    {
      title: 'AI Specialist',
      type: 'path',
      required: 'ai',
      descriptionTemplate: 'Completed AI path',
    },
    {
      title: 'Mobile Developer',
      type: 'path',
      required: 'mobile development',
      descriptionTemplate: 'Completed Mobile Development path',
    },
    {
      title: 'Web Developer',
      type: 'path',
      required: 'web development',
      descriptionTemplate: 'Completed Web Development path',
    },
    {
      title: 'Data Scientist',
      type: 'path',
      required: 'data science',
      descriptionTemplate: 'Completed Data Science path',
    },

    // Extra
    {
      title: 'Milestone Achiever',
      type: 'count',
      required: 5,
      categoryFilter: '3months',
      descriptionTemplate: 'Completed 5 courses in 3 months',
      extraCheck: check3Months5Courses,
    },
    {
      title: 'Quick Starter',
      type: 'first_course_fast',
      required: 24,
      descriptionTemplate: 'Completed first course within 24 hours',
    },
    {
      title: 'Speed Runner',
      type: 'single_course_fast',
      required: 2,
      descriptionTemplate: 'Finished a course in under 2 hours',
    },
    {
      title: 'Marathon Learner',
      type: 'total_courses',
      required: 50,
      descriptionTemplate: 'Completed 50 courses',
    },
    {
      title: 'Course Completions',
      type: 'total_courses',
      required: 10,
      descriptionTemplate: 'Completed 10 courses',
    },
  ];

  for (const rule of rules) {
    const badgeId = await findBatchIdByTitle(rule.title);
    if (!badgeId) continue;

    if (await hasBatch(userId, badgeId)) continue;

    let eligible = false;

    if (rule.type === 'count') {
      const filter: any = {
        userId,
        isComplete: true,
        isDeleted: false,
      };
      if (rule.categoryFilter) {
        if (rule.categoryFilter === 'top10') {
          filter.isTop10 = true;
        } else if (rule.categoryFilter === '3months') {
        } else {
          filter.courseCategory = rule.categoryFilter;
        }
      }
      const count = await prisma.enrolledCourse.count({ where: filter });
      eligible = count >= (rule.required as number);
    } else if (rule.type === 'unique_category') {
      const unique = await prisma.enrolledCourse.findMany({
        where: {
          userId,
          isComplete: true,
          isDeleted: false,
          ...(rule.categoryFilter
            ? { courseCategory: { contains: rule.categoryFilter } }
            : {}),
        },
        select: { courseCategory: true },
        distinct: ['courseCategory'],
      });
      eligible = unique.length >= (rule.required as number);
    } else if (rule.type === 'total_courses') {
      const count = await prisma.enrolledCourse.count({
        where: { userId, isComplete: true, isDeleted: false },
      });
      eligible = count >= (rule.required as number);
    } else if (rule.type === 'time_hours') {
      const totalMin = await prisma.enrolledCourse.aggregate({
        where: { userId, isComplete: true, isDeleted: false },
        _sum: { learningTime: true },
      });
      eligible =
        (totalMin._sum.learningTime ?? 0) >= (rule.required as number) * 60;
    } else if (rule.type === 'first_course_fast') {
      // first course completed time checked
      const firstCourse = await prisma.enrolledCourse.findFirst({
        where: { userId, isComplete: true, isDeleted: false },
        orderBy: { courseFinishTime: 'asc' },
        select: { courseStartTime: true, courseFinishTime: true },
      });
      if (firstCourse) {
        const hoursTaken =
          (firstCourse.courseFinishTime.getTime() -
            firstCourse.courseStartTime.getTime()) /
          (1000 * 60 * 60);
        eligible = hoursTaken <= (rule.required as number);
      }
    } else if (rule.type === 'single_course_fast') {
      // checked trigger course duration
      if (triggerDurationMins) {
        const hoursTaken = triggerDurationMins / 60;
        eligible = hoursTaken <= (rule.required as number);
      }
    } else if (rule.type === 'path') {
      // course category match based on path
      const hasPath = await prisma.enrolledCourse.findFirst({
        where: {
          userId,
          isComplete: true,
          isDeleted: false,
          courseCategory: rule.required as string,
        },
      });
      eligible = !!hasPath;
    }

    // if no extraCheck
    if (rule.extraCheck) {
      eligible = eligible && (await rule.extraCheck(userId));
    }

    if (eligible) {
      await prisma.achievement.update({
        where: { userId },
        data: { badges: { connect: { id: badgeId } } },
      });

      await prisma.achievementLogs.create({
        data: {
          userId,
          badgeId,
          courseId: triggerCourseId,
          modelType: AchievementModelType.badges,
        },
      });

      awarded.push(rule.title);
    }
  }

  return awarded;
}

// Helper: (Milestone Achiever)
async function check3Months5Courses(userId: string): Promise<boolean> {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const count = await prisma.enrolledCourse.count({
    where: {
      userId,
      isComplete: true,
      isDeleted: false,
      courseFinishTime: { gte: threeMonthsAgo },
    },
  });
  return count >= 5;
}

// Course Completed Notification → Admin
export const sendCourseCompleteNotifYToAuthor = async (
  user: Partial<User>,
  course: Partial<Course>,
  authorId: string,
) => {
  // Determine the message and description
  const message = messages.enrolledCourse.completed;
  const description = `${user?.name} has completed the course "${course.title}". Please review it.`;

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: authorId,
    message,
    description,
    modeType: NotificationModeType.enrolled_courses,
  });
};
