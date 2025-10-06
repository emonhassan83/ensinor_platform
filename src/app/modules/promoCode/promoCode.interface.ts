import { CouponModel } from '@prisma/client';

export type IPromoCodeFilterRequest = {
  searchTerm?: string | undefined;
  code?: string | undefined;
  discount?: string | undefined;
  modelType?: string | undefined;
};

export type IPromoCode = {
  authorId: string;
  modelType: CouponModel;
  bookId?: string;
  courseId?: string;
  eventId?: string;
  name: string;
  expireAt: Date;
  code: string;
  discount: number;
  maxUsage: number;
  isGlobal?: boolean;
};
