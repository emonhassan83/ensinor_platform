import { CouponModel } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    modelType: z.nativeEnum(CouponModel),
    // Conditional reference field
    bookId: z.string().uuid('Book ID must be a valid UUID').optional(),
    courseId: z.string().uuid('Course ID must be a valid UUID').optional(),
    eventId: z.string().uuid('Event ID must be a valid UUID').optional(),

    name: z.string({ required_error: 'Coupon name is required!' }),
    expireAt: z
      .string({ required_error: 'Coupon expireAt is required!' })
      .optional(),
    code: z.string({ required_error: 'Coupon code is required!' }),
    discount: z
      .number({ required_error: 'Coupon discount is required!' })
      .int('Coupon discount must be an integer')
      .nonnegative('Coupon discount must be a positive number'),
       maxUsage: z.number().int().positive().optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Coupon name is required!' }).optional(),
    expireAt: z
      .string({ required_error: 'Coupon expireAt is required!' })
      .optional(),
    code: z.string({ required_error: 'Coupon code is required!' }).optional(),
    discount: z
      .number({ required_error: 'Coupon discount is required!' })
      .int('Coupon discount must be an integer')
      .nonnegative('Coupon discount must be a positive number')
      .optional(),
      maxUsage: z.number().int().positive().optional(),
  }),
});

export const CouponValidation = {
  createValidationSchema,
  updateValidationSchema,
};
