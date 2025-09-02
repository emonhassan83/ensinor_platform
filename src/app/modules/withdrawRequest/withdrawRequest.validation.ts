import { WithdrawStatus } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    amount: z
      .number({ required_error: 'Withdraw amount is required' }),
    stripeTransferId: z.string({ required_error: 'Withdraw stripeTransferId is required!' }).optional(),
    paymentMethod: z.string({ required_error: 'Withdraw paymentMethod is required!' })
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(WithdrawStatus),
  }),
});

export const WithdrawRequestValidation = {
  createValidationSchema,
  updateValidationSchema,
};
