import { NotificationModeType, User } from "@prisma/client";
import { messages } from "../notification/notification.constant";
import { NotificationService } from "../notification/notification.service";

// User Status Change Notification → User
export const sendWithdrawStatusNotifYToUser = async (
  status: 'completed' | 'cancelled' ,
  user: Partial<User>,
) => {
  // Determine the message and description based on the status
  let message;
  let description;

  if (status === 'completed') {
    message = messages.withdrawRequest.completed;
    description = ``;
  } else {
    message = messages.withdrawRequest.cancelled;
    description = ``;
  }

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: user?.id,
    message,
    description,
    modeType: NotificationModeType.withdraw_request,
  });
};
