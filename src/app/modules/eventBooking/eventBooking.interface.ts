import { OrderStatus, PaymentStatus } from "@prisma/client";

export type IEventBookingFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
  location?: string | undefined;
};

export type IEventBooking = {
  eventId: string;
  userId: string;
  authorId: string;
  name: string;
  phone: string;
  email: string;
  organization: string;
  profession: string;
  city: string;
  country: string;
  amount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  document?: string;
};

export type IEventsBooking = {
  eventIds: string;
  userId: string;
  authorId: string;
  name: string;
  phone: string;
  email: string;
  organization: string;
  profession: string;
  city: string;
  country: string;
  amount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  document?: string;
};
