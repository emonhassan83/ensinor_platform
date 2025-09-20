import * as bcrypt from 'bcrypt';
import config from '../../config';
import { findAdmin } from '../../utils/findAdmin';
import { NotificationModeType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

export const hashedPassword = async (password: string): Promise<string> => {
  try {
    const hashedPassword: string = await bcrypt.hash(
      password,
      Number(config.bcrypt_salt_rounds),
    );
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

export const sendUserStatusNotifYToAdmin = async (
  status: 'active' | 'blocked',
  user: Partial<User>,
) => {
  const admin = await findAdmin();
  if (!admin) throw new Error('Super admin not found!');

  // Determine the message and description based on the status
  let message;
  let description;

  if (status === 'active') {
    message = messages.userManagement.accountActivated;
    description = `User ${user?.name} (ID: ${user?.id}) has been successfully activated.`;
  } else {
    message = messages.userManagement.accountDeactivated;
    description = `User ${user?.name} (ID: ${user?.id}) has been blocked from accessing the system.`;
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: admin?.id,
    message,
    description,
    modeType: NotificationModeType.users,
  });
};

export const sendUserStatusNotifYToUser = async (
  status: 'active' | 'blocked',
  user: Partial<User>,
) => {
  // Determine the message and description based on the status
  let message;
  let description;

  if (status === 'active') {
    message = messages.userManagement.accountActivated;
    description = `Your account has been successfully activated. You can now access all available features.`;
  } else {
    message = messages.userManagement.accountDeactivated;
    description = `Your account has been blocked. Please contact support for further assistance.`;
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: user?.id,
    message,
    description,
    modeType: NotificationModeType.users,
  });
};
