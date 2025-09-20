import { NotificationModeType, User } from '@prisma/client';
import { findAdmin } from '../../utils/findAdmin';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

// Company Request Notification → Admin
export const sendNotifYToAdmin = async (user: Partial<User>) => {
  const admin = await findAdmin();
  if (!admin) throw new Error('Super admin not found!');

  // Determine the message and description
  const message = messages.companyRequest.add;
  const description = `A new company request has been submitted by ${user?.name} (ID: ${user?.id}). Please review and take action.`;

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: admin?.id,
    message,
    description,
    modeType: NotificationModeType.users,
  });
};

// User Status Change Notification → User
export const sendNotifYToUser = async (
  status: 'pending' | 'active' | 'denied' | "blocked" |'deleted',
  userId: string,
) => {
  // Determine the message and description based on the status
  let message;
  let description;

  switch (status) {
    case 'active':
      message = messages.companyRequest.approved;
      description = `Congratulations your company request has been approved. You can now proceed with company-related features.`;
      break;

    case 'denied':
      message = messages.companyRequest.rejected;
      description = `Hello unfortunately your company request has been denied. Please contact support if you have any questions.`;
      break;

    case 'deleted':
      message = messages.companyRequest.deleted;
      description = `Hello your company request has been deleted by the admin.`;
      break;

    default:
      throw new Error('Invalid status for company request notification.');
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: userId,
    message,
    description,
    modeType: NotificationModeType.users,
  });
};
