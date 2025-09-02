import { CouponModel } from "@prisma/client";

export type ICouponFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
  discount?: string | undefined;
};

export type ICoupon = {
  authorId: string;
  modelType: CouponModel;
  referenceId: string;
  name: string;
  expireAt: Date;
  code: string;
  discount: number;
};
