import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    affiliateId: z
      .string({ required_error: 'Affiliate is required' })
      .uuid('affiliate must be a valid UUID'),
    courseId: z
      .string({ required_error: 'Course is required' })
      .uuid('course must be a valid UUID'),
    orderId: z
      .string({ required_error: 'Order id is required' })
      .uuid('order id must be a valid UUID'),
    commission: z
      .string({ required_error: 'Affiliate commission is required' })
  }),
});

export const AffiliateSaleValidation = {
  createValidationSchema
};
