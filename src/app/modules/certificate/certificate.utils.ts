import { Certificate, NotificationModeType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

export const sendCertificateNotifyToUser = async (
  user: Partial<User>, // course instructor
  certificate: Partial<Certificate>,
) => {
  const message = messages.certificate.completed;
  const description = `Hi ${user.name}, your certificate for "${certificate.courseName}" has been successfully completed and is now available.`;

  await NotificationService.createNotificationIntoDB({
    receiverId: user.id!,
    message,
    description,
    referenceId: certificate.id,
    modeType: NotificationModeType.certificate,
  });
};
