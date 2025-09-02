import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    reviewId: z
      .string({ required_error: 'Review id is required' })
      .uuid('review id must be a valid UUID'),
    comment: z.string({ required_error: 'Review comment is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    comment: z.string({ required_error: 'Review comment is required!' }).optional(),
  }),
});

export const ReviewRefValidation = {
  createValidationSchema,
  updateValidationSchema,
};
