import { OrderStatus, PaymentModelType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    modelType: z.nativeEnum(PaymentModelType),
    orderId: z
      .string({ required_error: 'Order id is required' })
      .uuid('Order id must be a valid UUID')
      .optional(),
    subscriptionId: z
      .string({ required_error: 'Subscription id is required' })
      .uuid('Subscription id must be a valid UUID')
      .optional()
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
