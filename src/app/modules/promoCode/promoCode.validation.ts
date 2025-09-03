import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    modelType: z.string({ required_error: 'PromoCode modelType is required!' }),
    referenceId: z
      .string({ required_error: 'Reference is required' })
      .uuid('reference must be a valid UUID'),
    expireAt: z
      .string({ required_error: 'PromoCode expireAt is required!' })
      .optional(),
    code: z.string({ required_error: 'PromoCode code is required!' }),
    discount: z
      .number({ required_error: 'PromoCode discount is required!' })
      .int('PromoCode discount must be an integer')
      .nonnegative('PromoCode discount must be a positive number'),
    maxUsage: z.string({ required_error: 'PromoCode maxUsage is required!' }),
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
      .string({ required_error: 'PromoCode maxUsage is required!' })
      .optional(),
  }),
});

export const PromoCodeValidation = {
  createValidationSchema,
  updateValidationSchema,
};
