import { OrderStatus } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    modelType: z.string({ required_error: 'Order modelType is required!' }),
    reference: z.string({ required_error: 'Order reference is required!' }),
    paymentMethod: z.string({ required_error: 'Oder paymentMethod is required!' }).optional()
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus)
  }),
});

export const OrderValidation = {
  createValidationSchema,
  updateValidationSchema,
};
