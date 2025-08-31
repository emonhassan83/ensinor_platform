import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    title: z.string({ required_error: 'Title is required!' }),
    shortDescription: z.string({
      required_error: 'Short description is required!',
    }),
    category: z.string({ required_error: 'Category is required!' }),
    level: z.string({ required_error: 'Course level is required!' }),
    language: z.string({ required_error: 'Course language is required!' }),
    points: z.number({ required_error: 'Course points is required!' }),
    deadline: z.string({ required_error: 'Course deadline is required!' }),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number'),
    description: z.string({
      required_error: 'Course description is required!',
    }),
    thumbnail: z
      .string({ required_error: 'Course thumbnail is required!' })
      .optional(),
    hasCertificate: z.boolean({
      required_error: 'Course hasCertificate is required!',
    }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required!' }).optional(),
    shortDescription: z
      .string({ required_error: 'Short description is required!' })
      .optional(),
    category: z.string({ required_error: 'Category is required!' }).optional(),
    level: z.string({ required_error: 'Course level is required!' }).optional(),
    language: z
      .string({ required_error: 'Course language is required!' })
      .optional(),
    points: z
      .number({ required_error: 'Course points is required!' })
      .optional(),
    deadline: z
      .string({ required_error: 'Course deadline is required!' })
      .optional(),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number')
      .optional(),
    description: z
      .string({ required_error: 'Course description is required!' })
      .optional(),
    thumbnail: z
      .string({ required_error: 'Course thumbnail is required!' })
      .optional(),
    hasCertificate: z
      .boolean({ required_error: 'Course hasCertificate is required!' })
      .optional(),
  }),
});

export const CourseValidation = {
  createValidationSchema,
  updateValidationSchema,
};
