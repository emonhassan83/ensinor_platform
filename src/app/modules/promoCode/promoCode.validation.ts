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
    expireAt: z
      .string({ required_error: 'PromoCode expireAt is required!' })
      .optional(),
    code: z.string({ required_error: 'PromoCode code is required!' }),
    discount: z
      .number({ required_error: 'PromoCode discount is required!' })
      .int('PromoCode discount must be an integer')
      .nonnegative('PromoCode discount must be a positive number'),
    maxUsage: z.number({ required_error: 'PromoCode maxUsage is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    expireAt: z
      .string({ required_error: 'PromoCode expireAt is required!' })
      .optional(),
    code: z
      .string({ required_error: 'PromoCode code is required!' })
      .optional(),
    discount: z
      .number({ required_error: 'PromoCode discount is required!' })
      .int('PromoCode discount must be an integer')
      .nonnegative('PromoCode discount must be a positive number')
      .optional(),
    maxUsage: z
      .number({ required_error: 'PromoCode maxUsage is required!' })
      .optional(),
  }),
});

export const PromoCodeValidation = {
  createValidationSchema,
  updateValidationSchema,
};
