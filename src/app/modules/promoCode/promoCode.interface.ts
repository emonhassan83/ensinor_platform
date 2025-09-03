import { CouponModel } from "@prisma/client";

export type IPromoCodeFilterRequest = {
  searchTerm?: string | undefined;
  code?: string | undefined;
  discount?: string | undefined;
  modelType?: string | undefined;
};

export type IPromoCode = {
  authorId: string;
  modelType: CouponModel;
  referenceId: string;
  code: string;
  discount: number;
  maxUsage: number
  expireAt: Date;
};
