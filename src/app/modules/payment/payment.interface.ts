import { PaymentMethod, PaymentModelType } from "@prisma/client";

export type IPaymentFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
  paymentStatus?: string | undefined;
  status?: string | undefined;
  paymentMethod?: string | undefined;
};

export interface IPayment {
  userId: string
  authorId: string
  modelType: PaymentModelType
  orderId?: string
  subscriptionId?: string
  amount: number
  adminCommission: number
  instructorEarning: number
  paymentMethod: PaymentMethod
  transactionId?: string
}
