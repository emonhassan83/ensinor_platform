import { CertificateRequest, NotificationModeType, User, CertificateRequestStatus } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';

/**
 * Notify course author when a new certificate request is sent
 */
export const sendCertificateRequestNotificationToAuthor = async (
  author: Partial<User>, // course instructor
  certificateRequest: any,
) => {
  const message = messages.certificateRequest.newRequest;
  const description = `A new certificate request has been submitted for course "${certificateRequest.course?.title}". Please review it.`;

  await NotificationService.createNotificationIntoDB({
    receiverId: author.id!,
    message,
    description,
    referenceId: certificateRequest.id,
    modeType: NotificationModeType.certificate,
  });
};

/**
 * Notify student when certificate request status changes
 */
export const sendCertificateStatusNotificationToUser = async (
  user: Partial<User>, // student requesting certificate
  certificateRequest: any,
) => {
  let statusText = '';
  switch (certificateRequest.status) {
    case CertificateRequestStatus.approved:
      statusText = 'approved';
      break;
    case CertificateRequestStatus.denied:
      statusText = 'denied';
      break;
    default:
      statusText = 'updated';
      break;
  }

  const message = messages.certificateRequest.statusChanged;
  const description = `Your certificate request for course "${certificateRequest.course?.title}" has been ${statusText}.`;

  await NotificationService.createNotificationIntoDB({
    receiverId: user.id!,
    message,
    description,
    referenceId: certificateRequest.id,
    modeType: NotificationModeType.certificate,
  });
};
