import { Assignment, Course, NotificationModeType } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

// Assignment Published Notification → Enrolled Users
export const sendAssignmentPublishedNotifYToEnrolledUsers = async (
  enrolledUserIds: string[],
  assignment: Partial<Assignment>,
  course: Partial<Course>,
) => {
  const message = messages.assignment.published;
  const description = `A new assignment "${assignment.title}" has been published in the course "${course.title}". Please check it out.`;

  await Promise.all(
    enrolledUserIds.map(userId =>
      NotificationService.createNotificationIntoDB({
        receiverId: userId,
        message,
        description,
        referenceId: assignment.id,
        modeType: NotificationModeType.assignment,
      }),
    ),
  );
};
