import { OrderModelType, PaymentMethod } from "@prisma/client";

export type IOrderFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
  paymentStatus?: string | undefined;
  status?: string | undefined;
};

export interface IOrder {
  userId: string
  modelType: OrderModelType
  reference: string
  amount: number
  paymentMethod: PaymentMethod
  documents?: string[]
  transactionId?: string
}
