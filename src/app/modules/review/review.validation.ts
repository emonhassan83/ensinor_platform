import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    courseId: z
      .string({ required_error: 'Reference is required' })
      .uuid('reference must be a valid UUID'),
    rating: z.number({ required_error: 'Review rating is required!' }),
    comment: z.string({ required_error: 'Review comment is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    rating: z.number({ required_error: 'Review rating is required!' }).optional(),
    comment: z.string({ required_error: 'Review comment is required!' }).optional(),
  }),
});

export const ReviewValidation = {
  createValidationSchema,
  updateValidationSchema,
};
