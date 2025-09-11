import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'name is required' }),
    authorId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    modelType: z.enum(['course', 'book', 'event'], {
      required_error: 'Wishlist modelType is required!',
    }),
    courseId: z.string().uuid('courseId must be a valid UUID').optional(),
    bookId: z.string().uuid('bookId must be a valid UUID').optional(),
    eventId: z.string().uuid('eventId must be a valid UUID').optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'name is required' }).optional(),
    file: z.string({ required_error: 'file is required' }).optional(),
  }),
});

export const ResourceValidation = {
  createValidationSchema,
  updateValidationSchema,
};
