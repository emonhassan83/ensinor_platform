import { OrderModelType, OrderStatus } from '@prisma/client';
import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    orderData: z.object({
      userId: z.string({
        required_error: 'User ID is required',
      }).uuid("Invalid UUID format"),
      couponCode: z.string({
        required_error: 'Coupon code is required',
      }).optional(),
      promoCode: z.string({
        required_error: 'Promo code is required',
      }).optional(),
      affiliateId: z.string({
        required_error: 'Affiliate ID is required',
      }).uuid().optional()
    }),
    items: z.array(
      z.object({
        modelType: z.nativeEnum(OrderModelType),
        referenceId: z.string().uuid(),
        quantity: z.number().int().min(1).optional(),
      })
    ).nonempty("At least one item is required"),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus),
  }),
});

export const OrderValidation = {
  createValidationSchema,
  updateValidationSchema,
};
