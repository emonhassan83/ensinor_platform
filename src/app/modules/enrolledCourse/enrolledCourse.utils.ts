import { Course, NotificationModeType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

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
