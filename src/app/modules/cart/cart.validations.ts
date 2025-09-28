import { CartModelType } from '@prisma/client';
import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'Article name is required' })
      .uuid('receiver must be a valid UUID'),
    modelType: z.nativeEnum(CartModelType),
    bookId: z
      .string({ required_error: 'Book id is required' })
      .uuid('book id must be a valid UUID').optional(),
    courseId: z
      .string({ required_error: 'Course id is required' })
      .uuid('course id must be a valid UUID').optional(),
  }),
});

export const CartValidation = {
  createValidationSchema
};
