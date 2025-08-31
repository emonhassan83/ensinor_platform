import { PaymentStatus, SubscriptionStatus, SubscriptionType } from "@prisma/client"

export type ISubscriptionFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
  paymentStatus?: string | undefined;
  status?: string | undefined;
};

export type ISubscription = {
  userId: string;
  packageId: string;
  type?: SubscriptionType;
  transactionId?: string;
  amount?: number;
  paymentStatus?: PaymentStatus;
  status?: SubscriptionStatus;
  expiredAt?: Date;
};