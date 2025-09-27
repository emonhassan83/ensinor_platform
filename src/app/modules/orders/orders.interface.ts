import { OrderModelType, PaymentMethod } from "@prisma/client";

export type IOrderFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
  paymentStatus?: string | undefined;
  status?: string | undefined;
};

export interface IOrder {
  userId: string
  authorId: string
  instructorId?: string
  modelType: OrderModelType
  bookId?: string
  courseId?: string
  eventId?: string
  courseBundleId?: string
  couponCode?: string;
  promoCode?: string;
  affiliateId?: string
  amount: number
  paymentMethod: PaymentMethod
  discount?: number
  documents?: string
  transactionId?: string
}
