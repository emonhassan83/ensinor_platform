import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    course: z.array(
      z
        .string({ required_error: 'Author is required' })
        .uuid('author must be a valid UUID'),
    ),
    title: z.string({ required_error: 'Title course bundle is required!' }),
    category: z.string({ required_error: 'Category is required!' }),
    thumbnail: z
      .string({ required_error: 'Course bundle thumbnail is required!' })
      .optional(),
    discount: z
      .number({
        required_error: 'Course bundle discount is required!',
      })
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Title course bundle is required!' })
      .optional(),
    category: z.string({ required_error: 'Category is required!' }).optional(),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number')
      .optional(),
    thumbnail: z
      .string({ required_error: 'Course bundle thumbnail is required!' })
      .optional(),
    discount: z
      .number({
        required_error: 'Course bundle discount is required!',
      })
      .optional(),
  }),
});

export const CourseBundleValidation = {
  createValidationSchema,
  updateValidationSchema,
};
