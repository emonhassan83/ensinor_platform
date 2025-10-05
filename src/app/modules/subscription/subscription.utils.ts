import { messages } from '../notification/notification.constant';
import { NotificationModeType, Package, User } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';

export const subscriptionNotifyToUser = async (
  action: 'EXPIRED' | 'WARNING',
  packages: Package,
  user?: User,
) => {
  // Determine the message and description based on the action
  let message;
  let description;

  switch (action) {
    case 'EXPIRED':
      message = messages.subscription.expired;
       description = `Your subscription for "${packages.title}" has expired. Please renew to continue enjoying our services.`;
      break;

    case 'WARNING':
      message = messages.subscription.warningForPlan;
     description = `Your subscription for "${packages.title}" is expiring today. Please renew to avoid interruption.`;
      break;
    default:
      throw new Error('Invalid action type');
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: user?.id,
    message,
    description,
    modeType: NotificationModeType.subscription,
  });
};
