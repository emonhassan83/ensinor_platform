import { OrderModelType, OrderStatus } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    modelType: z.nativeEnum(OrderModelType),
    bookId: z
      .string({ required_error: 'Book id is required' })
      .uuid('book id must be a valid UUID')
      .optional(),
    courseId: z
      .string({ required_error: 'Course id is required' })
      .uuid('course id must be a valid UUID')
      .optional(),
    courseBundleId: z
      .string({ required_error: 'Course bundle id is required' })
      .uuid('course bundle id must be a valid UUID')
      .optional(),
    paymentMethod: z
      .string({ required_error: 'Oder paymentMethod is required!' })
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus),
  }),
});

export const OrderValidation = {
  createValidationSchema,
  updateValidationSchema,
};
