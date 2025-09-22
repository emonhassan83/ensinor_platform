import { NotificationModeType, PlatformType, User } from '@prisma/client';
import { findAdmin } from '../../utils/findAdmin';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

// Book Notification → Admin
export const sendNotifYToAdmin = async (
  user: Partial<User>,
  platformOwner: Partial<User>
) => {
  // Determine the message and description
  const message = messages.shop.added;
  const description = `${user?.name} has added a new book. Please review it for approval.`;

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: platformOwner?.id,
    message,
    description,
    modeType: NotificationModeType.shop,
  });
};

// Book Status Change Notification → User
export const sendNotifYToUser = async (
  status: 'inReview' | 'published' | 'deleted',
  userId: string,
) => {
  // Determine the message and description based on the status
  let message;
  let description;

  switch (status) {
    case 'inReview':
      message = messages.shop.changedStatus;
      description = `Your book has been submitted and is currently under review.`;
      break;

    case 'published':
      message = messages.shop.changedStatus;
      description = `Congratulations! Your book has been approved and published in the shop.`;
      break;

    case 'deleted':
      message = messages.shop.deleted;
      description = `Your book has been removed from the shop.`;
      break;

    default:
      throw new Error('Invalid status for book notification.');
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: userId,
    message,
    description,
    modeType: NotificationModeType.shop,
  });
};
