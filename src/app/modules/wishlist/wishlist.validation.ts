import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    modelType: z.enum(['course', 'book'], {
      required_error: 'Wishlist modelType is required!',
    }),
    courseId: z.string().uuid('courseId must be a valid UUID').optional(),
    bookId: z.string().uuid('bookId must be a valid UUID').optional(),
  }),
});

export const WishlistValidation = {
  createValidationSchema,
};
