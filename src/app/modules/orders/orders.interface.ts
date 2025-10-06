import { OrderModelType, PaymentMethod } from '@prisma/client';

export type IOrderFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
  paymentStatus?: string | undefined;
  status?: string | undefined;
};

export interface IOrderItem {
  referenceId: string;
  modelType: OrderModelType; // 'book' | 'course' | 'courseBundle' | 'event'
  price: number;
  quantity?: number;
}

// 🔹 Order Data (general info)
export interface IOrder {
  orderData: {
    userId: string;
    authorId: string;
    companyId?: string;
    couponCode?: string;
    promoCode?: string;
    affiliateId?: string;
    amount?: number; 
    paymentMethod: PaymentMethod;
    transactionId?: string;
    files?: string[]
  };
  items: IOrderItem[];
}