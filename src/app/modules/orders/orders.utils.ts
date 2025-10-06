import { CouponModel, OrderModelType, PromoCodeModel } from '@prisma/client';
import httpStatus from 'http-status';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import cron from 'node-cron';

// 🔹 Config for model mapping
const modelConfig: Record<OrderModelType, { model: any; priceField: string }> =
  {
    [OrderModelType.book]: {
      model: prisma.book,
      priceField: 'price',
    },
    [OrderModelType.course]: {
      model: prisma.course,
      priceField: 'price',
    },
    [OrderModelType.courseBundle]: {
      model: prisma.courseBundle,
      priceField: 'price',
    },
    [OrderModelType.event]: {
      model: prisma.event,
      priceField: 'price',
    },
  };

// 🔹 Fetch Entity by Type
export const fetchEntity = async (
  modelType: OrderModelType,
  referenceId: string,
) => {
  const config = modelConfig[modelType];
  if (!config) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid model type!');
  }

  const entity = await config.model.findFirst({
    where: { id: referenceId, isDeleted: false },
  });

  if (!entity) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `${modelType} with id ${referenceId} not found!`,
    );
  }

  return entity;
};

// 🔹 Validate Coupon
export const validateCoupon = async (
  couponCode: string,
  modelType: CouponModel,
  referenceId: string,
) => {
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: couponCode,
      isActive: true,
      modelType,
      OR: [
        { bookId: modelType === 'book' ? referenceId : null },
        { courseId: modelType === 'course' ? referenceId : null },
        { eventId: modelType === 'event' ? referenceId : null },
      ],
    },
  });

  if (!coupon)
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon invalid for this item!');

  // Check expiration
  if (new Date() > coupon.expireAt) {
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { isActive: false },
    });
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon has expired!');
  }

  if (coupon.maxUsage && coupon.usedCount >= coupon.maxUsage) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Coupon usage limit reached!');
  }

  // increment usage
  const updatedCoupon = await prisma.coupon.update({
    where: { id: coupon.id },
    data: { usedCount: { increment: 1 } },
  });

  // if maxUsage reached, set isActive to false
  if (
    updatedCoupon.maxUsage &&
    updatedCoupon.usedCount >= updatedCoupon.maxUsage
  ) {
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { isActive: false },
    });
  }

  return coupon;
};

// 🔹 Validate Promo
export const validatePromo = async (
  promoCode: string,
  modelType: PromoCodeModel,
  referenceId: string,
) => {
  const promo = await prisma.promoCode.findFirst({
    where: {
      code: promoCode,
      isActive: true,
      modelType,
      OR: [
        { bookId: modelType === 'book' ? referenceId : null },
        { courseId: modelType === 'course' ? referenceId : null },
        { eventId: modelType === 'event' ? referenceId : null },
      ],
    },
  });

  if (!promo)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Promo code invalid for this item!',
    );

  // Check expiration
  if (new Date() > promo.expireAt) {
    await prisma.promoCode.update({
      where: { id: promo.id },
      data: { isActive: false },
    });
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promo code has expired!');
  }

  if (promo.maxUsage && promo.usedCount >= promo.maxUsage) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Promo usage limit reached!');
  }

  const updatedPromo = await prisma.promoCode.update({
    where: { id: promo.id },
    data: { usedCount: { increment: 1 } },
  });

  // if maxUsage reached, set isActive to false
  if (
    updatedPromo.maxUsage &&
    updatedPromo.usedCount >= updatedPromo.maxUsage
  ) {
    await prisma.promoCode.update({
      where: { id: promo.id },
      data: { isActive: false },
    });
  }

  return promo;
};

// 🔹 Validate Affiliate
export const validateAffiliate = async (affiliateId: string) => {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
  });

  if (!affiliate) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Affiliate not found!');
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


// ✅ Cleanup expired or inactive coupons & promo codes Runs every day at 2:00 AM
export const cleanupCouponsAndPromos = () => {
  cron.schedule('0 2 * * *', async () => {
    try {
      const now = new Date();

      // Delete expired or inactive coupons
      const deletedCoupons = await prisma.coupon.deleteMany({
        where: {
          OR: [
            { isActive: false },
            { expireAt: { lt: now } },
          ],
        },
      });
      console.log(`Deleted ${deletedCoupons.count} expired/inactive coupons.`);

      // Delete expired or inactive promo codes
      const deletedPromos = await prisma.promoCode.deleteMany({
        where: {
          OR: [
            { isActive: false },
            { expireAt: { lt: now } },
          ],
        },
      });
      console.log(`Deleted ${deletedPromos.count} expired/inactive promo codes.`);

    } catch (error: any) {
      console.error('Error cleaning up coupons and promo codes:', error.message);
    }
  });
};