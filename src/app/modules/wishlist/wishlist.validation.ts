import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    modelType: z.string({ required_error: 'Wishlist modelType is required!' }),
    referenceId: z
      .string({ required_error: 'Reference is required' })
      .uuid('reference must be a valid UUID'),
  }),
});


export const WishlistValidation = {
  createValidationSchema
};
