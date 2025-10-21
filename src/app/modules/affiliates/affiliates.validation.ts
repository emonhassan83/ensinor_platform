import { AffiliateModel } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    affiliateId: z
      .string({ required_error: 'Affiliate is required' })
      .uuid('affiliate must be a valid UUID'),
    modelType: z.nativeEnum(AffiliateModel),
    bookId: z
      .string({ required_error: 'Book is required' })
      .uuid('book must be a valid UUID')
      .optional(),
    courseId: z
      .string({ required_error: 'Course is required' })
      .uuid('course must be a valid UUID')
      .optional(),
    eventId: z
      .string({ required_error: 'Event is required' })
      .uuid('event must be a valid UUID')
      .optional(),
  }),
});

// Update validation
const affiliateAccountSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User is required' })
      .uuid('user id must be a valid UUID'),
  }),
});

export const AffiliateValidation = {
  createValidationSchema,
  affiliateAccountSchema,
};
