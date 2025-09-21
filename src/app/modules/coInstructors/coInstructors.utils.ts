import { NotificationModeType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

export const sendCoInstructorNotification = async (
  inviter: Partial<User>,
  userId: string,
  type: 'invitation' | 'revoke' | 'deleted',
) => {
  // Determine the message and description based on the type
  let message;
  let description;

  if (type === 'invitation') {
    message = messages.coInstructor.invitation;
    description = `You have been invited by ${inviter?.name} (ID: ${inviter?.id}) to join as a Co-Instructor.`;
  } else if (type === 'revoke') {
    message = messages.coInstructor.revoke;
    description = `Your Co-Instructor access has been revoked by ${inviter?.name} (ID: ${inviter?.id}).`;
  } else {
    message = messages.coInstructor.deleted;
    description = `Your Co-Instructor role has been deleted by ${inviter?.name} (ID: ${inviter?.id}).`;
  }

  await NotificationService.createNotificationIntoDB({
    receiverId: userId,
    message,
    description,
    modeType: NotificationModeType.users,
  });
};
