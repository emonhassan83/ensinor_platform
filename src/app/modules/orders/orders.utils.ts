
import { CouponModel, OrderModelType, PromoCodeModel } from "@prisma/client";
import httpStatus from "http-status";
import prisma from "../../utils/prisma";
import ApiError from "../../errors/ApiError";

// 🔹 Config for model mapping
const modelConfig: Record<
  OrderModelType,
  { model: any; priceField: string }
> = {
  [OrderModelType.book]: {
    model: prisma.book,
    priceField: "price",
  },
  [OrderModelType.course]: {
    model: prisma.course,
    priceField: "price",
  },
  [OrderModelType.courseBundle]: {
    model: prisma.courseBundle,
    priceField: "price",
  },
  [OrderModelType.event]: {
    model: prisma.event,
    priceField: "price",
  },
};

// 🔹 Fetch Entity by Type
export const fetchEntity = async (
  modelType: OrderModelType,
  referenceId: string
) => {
  const config = modelConfig[modelType];
  if (!config) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid model type!");
  }

  const entity = await config.model.findFirst({
    where: { id: referenceId, isDeleted: false },
  });

  if (!entity) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `${modelType} with id ${referenceId} not found!`
    );
  }

  return entity;
};

// 🔹 Validate Coupon
export const validateCoupon = async (couponCode: string, modelType: CouponModel, referenceId: string) => {
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: couponCode,
      isActive: true,
      expireAt: { gte: new Date() },
      modelType,
      OR: [
        { bookId: modelType === 'book' ? referenceId : null },
        { courseId: modelType === 'course' ? referenceId : null },
        { eventId: modelType === 'event' ? referenceId : null },
      ],
    },
  });

  if (!coupon) throw new ApiError(httpStatus.BAD_REQUEST, "Coupon invalid for this item!");

  if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Coupon usage limit reached!");
  }

  // increment usage
  await prisma.coupon.update({
    where: { id: coupon.id },
    data: { usedCount: { increment: 1 } },
  });

  return coupon;
};


// 🔹 Validate Promo
export const validatePromo = async (promoCode: string, modelType: PromoCodeModel, referenceId: string) => {
  const promo = await prisma.promoCode.findFirst({
    where: {
      code: promoCode,
      isActive: true,
      expireAt: { gte: new Date() },
      modelType,
      OR: [
        { bookId: modelType === 'book' ? referenceId : null },
        { courseId: modelType === 'course' ? referenceId : null },
        { eventId: modelType === 'event' ? referenceId : null },
      ],
    },
  });

  if (!promo) throw new ApiError(httpStatus.BAD_REQUEST, "Promo code invalid for this item!");

  if (promo.maxUsage && promo.usedCount >= promo.maxUsage) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Promo usage limit reached!");
  }

  await prisma.promoCode.update({
    where: { id: promo.id },
    data: { usedCount: { increment: 1 } },
  });

  return promo;
};

// 🔹 Validate Affiliate
export const validateAffiliate = async (affiliateId: string) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
  });

  if (!affiliate) {
    throw new ApiError(httpStatus.NOT_FOUND, "Affiliate not found!");
  }
  return affiliate;
};

export function calculateRevenue(finalAmount: number, orderData: any) {
  let instructorShare = 0;
  let platformShare = 0;
  let affiliateShare = 0;

  if (orderData.affiliateId) {
    affiliateShare = finalAmount * 0.2;
    const remaining = finalAmount - affiliateShare;
    instructorShare = remaining * 0.5;
    platformShare = remaining * 0.5;
  } else if (orderData.promoCode) {
    instructorShare = finalAmount * 0.97;
    platformShare = finalAmount * 0.03;
  } else if (orderData.couponCode) {
    instructorShare = finalAmount * 0.5;
    platformShare = finalAmount * 0.5;
  } else {
    instructorShare = finalAmount * 0.5;
    platformShare = finalAmount * 0.5;
  }

  return { instructorShare, platformShare, affiliateShare };
}
