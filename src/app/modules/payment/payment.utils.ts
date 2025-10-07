import Stripe from 'stripe';
import config from '../../config';
import { findAdmin } from '../../utils/findAdmin';
import { messages } from '../notification/notification.constant';
import { NotificationModeType, Payment } from '@prisma/client';
import { NotificationService } from '../notification/notification.service';
import emailSender from '../../utils/emailSender';

const stripe: Stripe = new Stripe(config.stripe?.stripe_api_secret as string, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
});
interface TPayload {
  product: {
    amount: number;
    name: string;
    quantity: number;
  };
  // customerId: string;
  paymentId: string;
}

export const createCheckoutSession = async (payload: TPayload) => {
  const paymentGatewayData = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: payload?.product?.name,
          },
          unit_amount: Math.round(payload.product?.amount * 100),
        },
        quantity: payload.product?.quantity,
      },
    ],

    success_url: `${config.server_url}/payments/confirm-payment?sessionId={CHECKOUT_SESSION_ID}&paymentId=${payload?.paymentId}`,
    cancel_url: config?.payment_cancel_url,
    mode: 'payment',
    invoice_creation: {
      enabled: true,
    },
    payment_method_types: ['card'],
  });

  return paymentGatewayData.url;
};

export const paymentNotifyToAdmin = async (
  type: 'SUCCESS' | 'REFUND',
  payment: Payment,
) => {
  const admin = await findAdmin();

  // Define message and description based on type
  const message =
    type === 'SUCCESS'
      ? messages.paymentManagement.paymentSuccess
      : messages.paymentManagement.paymentRefunded;

  const description =
    type === 'SUCCESS'
      ? `A payment of $${payment.amount} has been successfully received. Transaction ID: ${payment.transactionId}.`
      : `A refund of $${payment.amount} has been successfully processed. Refund Transaction ID: ${payment.transactionId}.`;

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: admin?.id,
    message,
    description,
    modeType: NotificationModeType.payment,
  });
};

export const paymentNotifyToUser = async (
  type: 'SUCCESS' | 'REFUND',
  payment: Payment,
) => {
  // Define message and description based on type
  const message =
    type === 'SUCCESS'
      ? messages.paymentManagement.paymentSuccess
      : messages.paymentManagement.paymentRefunded;

  const description =
    type === 'SUCCESS'
      ? ` Your payment was successful. Thank you for investing in yourself — this space is always here for you.`
      : `A refund of $${payment.amount} has been issued to your account. Refund Transaction ID: ${payment.transactionId}.`;

  // Create a notification entry
  await NotificationService.createNotificationIntoDB({
    receiverId: payment?.userId,
    message,
    description,
    modeType: NotificationModeType.payment,
  });
};

export const sendOrderConfirmationAndDocumentsEmail = async (
  user: any,
  order: any,
) => {
  if (!user?.email) return;

  const pdfFiles = order.files?.filter((file: string) => file) || [];
  if (pdfFiles.length === 0) return;

  const zipDownloadLink = `
    <div style="margin: 20px 0;">
      <a href="${config.server_url}/download/order/${order.id}"
         style="background-color: #eebc19ff; color: black; padding: 12px 20px;
         border-radius: 5px; text-decoration: none;" target="_blank">
        📥 Download Your eBooks (ZIP)
      </a>
    </div>
  `;

  const subject = `🎉 Congratulations ${user.name || ''}! Your Book Purchase is Confirmed`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;
    padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #333;">Thank You for Your Purchase!</h2>
      <p>Hi ${user.name || 'there'},</p>
      <p>Congratulations on your successful purchase! Your books are ready to download.</p>
      ${zipDownloadLink}
      <p>If you have any questions, feel free to contact our support team anytime.</p>
      <p style="margin-top: 10px;">— The Team</p>
    </div>
  `;

  await emailSender(user.email, subject, htmlContent);
};
