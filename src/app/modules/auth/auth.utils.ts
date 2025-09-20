import jwt from 'jsonwebtoken'
import { NotificationService } from '../notification/notification.service';
import { messages } from '../notification/notification.constant';
import { NotificationModeType, User } from '@prisma/client';

export type TExpiresIn =
  | number
  | '30s'
  | '1m'
  | '5m'
  | '10m'
  | '1h'
  | '1d'
  | '7d'
  | '30d'
  | '365d'

export const createToken = (
  jwtPayload: { userId: string; email: string; role: string },
  secret: string,
  expiresIn: TExpiresIn,
) => {
  return jwt.sign(jwtPayload, secret, { expiresIn })
}

export const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret) as jwt.JwtPayload
}

export const authNotify = async (
  action: 'PASSWORD_CHANGE' | 'PASSWORD_RESET',
  user: Partial<User>
) => {

  // Determine the message and description based on the action
  let message
  let description

    switch (action) {
    case "PASSWORD_CHANGE":
      message = messages.authSettings.passwordChanged;
      description = `Hello ${user?.name}, your password was successfully changed. If you did not perform this action, please contact support immediately.`;
      break;

    case "PASSWORD_RESET":
      message = messages.authSettings.passwordReset;
      description = `Hello ${user?.name}, your password has been reset. Use your new password to login. If this was not you, please secure your account.`;
      break;

    default:
      throw new Error("Invalid action type");
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: user?.id,
    message,
    description,
     modeType: NotificationModeType.users,
  })
}
