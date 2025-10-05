import { PaymentMethod, PaymentModelType, PaymentType } from "@prisma/client";

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
  companyId?: string
  modelType: PaymentModelType
  type: PaymentType
  orderId?: string
  subscriptionId?: string
  amount: number
  platformShare?: number
  instructorShare?: number
  coInstructorsShare?: number
  paymentMethod: PaymentMethod
  transactionId?: string
}
