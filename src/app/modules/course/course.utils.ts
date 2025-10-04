import { NotificationModeType, PlatformType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

// Course Notification → Admin
export const sendNotifYToAdmin = async (
  user: Partial<User>,
  platformOwner: Partial<User>
) => {
  // Determine the message and description
  const message = messages.course.added;
  const description = `${user?.name} has added a new course. Please review it for approval.`;

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: platformOwner?.id,
    message,
    description,
    modeType: NotificationModeType.course,
  });
};

// Course Status Change Notification → User
export const sendNotifYToUser = async (
  status: 'pending' | 'approved' | 'denied' | 'deleted' | 'assign',
  userId: string,
) => {
  // Determine the message and description based on the status
  let message;
  let description;

  switch (status) {
    case 'pending':
      message = messages.course.changedStatus;
      description = `Your course has been submitted and is currently under review.`;
      break;

    case 'approved':
      message = messages.course.changedStatus;
      description = `Congratulations! Your course has been approved and published in the platform.`;
      break;

    case 'denied':
      message = messages.course.changedStatus;
      description = `Your course has been denied from the platform.`;
      break;

    case 'deleted':
      message = messages.course.deleted;
      description = `Your course has been removed from the platform.`;
      break;
    case 'assign':
      message = messages.course.assign;
      description = `You have been assigned as the instructor for the course`;
      break;

    default:
      throw new Error('Invalid status for book notification.');
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: userId,
    message,
    description,
    modeType: NotificationModeType.course,
  });
};
