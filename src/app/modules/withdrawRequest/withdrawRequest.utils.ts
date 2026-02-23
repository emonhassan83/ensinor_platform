import { NotificationModeType, User } from '@prisma/client';
import { messages } from '../notification/notification.constant';
import { NotificationService } from '../notification/notification.service';
import { sendEmail } from '../../utils/sendEmail';

// User Status Change Notification → User
export const sendWithdrawStatusNotifYToUser = async (
  status: 'approved' | 'completed' | 'cancelled' | 'failed',
  user: Partial<User>,
  amount?: number,
) => {
  // Determine the message and description based on the status
  let message: string;
  let description: string;

  switch (status) {
    case 'approved':
      message = `Withdrawal request approved`;
      description = `Your withdrawal request of $${amount?.toFixed(2)} has been approved. Funds will be processed soon.`;
      break;
    case 'completed':
      message = `Withdrawal completed`;
      description = `Your withdrawal of $${amount?.toFixed(2)} has been successfully completed and deducted from your balance.`;
      break;
    case 'cancelled':
      message = `Withdrawal cancelled`;
      description = `Your withdrawal request of $${amount?.toFixed(2)} has been cancelled. Contact support if you need assistance.`;
      break;
    case 'failed':
      message = `Withdrawal failed`;
      description = `Your withdrawal request of $${amount?.toFixed(2)} has failed. Please try again or contact support.`;
      break;
  }
  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: user?.id,
    message,
    description,
    modeType: NotificationModeType.withdraw_request,
  });
};

export const sendWithdrawApprovedEmail = async (
  user: Partial<User>,
  amount: number,
) => {
  if (!user?.email) return;

  const subject = 'Withdrawal Approved ✅';
  const body = `
  Hello ${user.name},

  Your withdrawal request of $${amount.toFixed(2)} has been approved by the admin.
  The payout will be processed shortly.

  Thank you for using our platform!
  `;

  await sendEmail({ to: user.email, subject, html: body, text: subject });
};

export const sendWithdrawCompletedEmail = async (
  user: Partial<User>,
  amount: number,
  remainingBalance: number,
) => {
  if (!user?.email) return;

  const subject = 'Withdrawal Completed 💸';
  const body = `
  Hello ${user.name},

  Your withdrawal of $${amount.toFixed(2)} has been successfully processed and deducted from your balance.

  Remaining balance: $${remainingBalance.toFixed(2)}

  Thank you for using our platform!
  `;

  await sendEmail({ to: user.email, subject, html: body, text: subject });
};

export const sendWithdrawCancelledEmail = async (
  user: Partial<User>,
  amount: number,
) => {
  if (!user?.email) return;

  const subject = 'Withdrawal Cancelled ❌';
  const body = `
  Hello ${user.name},

  Your withdrawal request of $${amount.toFixed(2)} has been cancelled.
  Please contact support for further details.

  Thank you for using our platform!
  `;

  await sendEmail({ to: user.email, subject, html: body, text: subject });
};
