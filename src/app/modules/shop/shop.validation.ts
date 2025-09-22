import { PlatformType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    companyId: z
      .string({ required_error: 'Company is required' })
      .uuid('company must be a valid UUID').optional(),
    platform: z.nativeEnum(PlatformType),
    title: z.string({ required_error: 'Title is required!' }),
    description: z.string({ required_error: 'Description is required!' }),
    writer: z.string({ required_error: 'Writer is required!' }),
    category: z.string({ required_error: 'Category is required!' }),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number'),
    file: z.string({ required_error: 'File is required!' }).optional(),
    publishedDate: z.string({ required_error: 'Published Date is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required!' }).optional(),
    description: z
      .string({ required_error: 'Description is required!' })
      .optional(),
    writer: z.string({ required_error: 'Writer is required!' }).optional(),
    category: z.string({ required_error: 'Category is required!' }).optional(),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number')
      .optional(),
    file: z.string({ required_error: 'File is required!' }).optional(),
  }),
});

export const ShopValidation = {
  createValidationSchema,
  updateValidationSchema,
};
