import { WishListModelType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    modelType: z.nativeEnum(WishListModelType),
    courseId: z.string().uuid('courseId must be a valid UUID').optional(),
    courseBundleId: z.string().uuid('course bundle Id must be a valid UUID').optional(),
    bookId: z.string().uuid('bookId must be a valid UUID').optional(),
  }),
});

export const WishlistValidation = {
  createValidationSchema,
};
