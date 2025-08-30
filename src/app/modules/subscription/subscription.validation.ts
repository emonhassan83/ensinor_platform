import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    user: z
      .string({ required_error: 'User is required' })
      .uuid('receiver must be a valid UUID'),
    package: z
      .string({ required_error: 'Package is required' })
      .uuid('receiver must be a valid UUID'),
  }),
});

export const SubscriptionValidation = {
  createValidationSchema,
};
