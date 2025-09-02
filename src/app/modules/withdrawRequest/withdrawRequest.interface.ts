import { PaymentMethod } from "@prisma/client";

export type IWithdrawRequestFilterRequest = {
  searchTerm?: string | undefined;
  stripeTransferId?: string | undefined;
};

export type IWithdrawRequest = {
  userId: string;
  amount: number;
  stripeTransferId?: string;
  paymentMethod: PaymentMethod;
};
