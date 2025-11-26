import { CoursesStatus, CourseType, PlatformType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    title: z.string({ required_error: 'Title is required!' }),
    type: z.nativeEnum(CourseType).optional(),
    platform: z.nativeEnum(PlatformType),
    description: z.string({
      required_error: 'Course description is required!',
    }),
    shortDescription: z.string({
      required_error: 'Short description is required!',
    }),
    category: z.string({ required_error: 'Category is required!' }),
    topics: z.array(z.string({ required_error: 'Topics is required!' })),
    level: z.string({ required_error: 'Course level is required!' }),
    language: z.string({ required_error: 'Course language is required!' }),
    audience: z.array(
      z.string({ required_error: 'Course audience is required!' }),
    ),
    objectives: z.array(
      z.string({ required_error: 'Course objectives is required!' }),
    ),
    prerequisites: z.string({
      required_error: 'Course prerequisites is required!',
    }),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number'),
    hasCertificate: z
      .boolean({
        required_error: 'Course hasCertificate is required!',
      })
      .optional(),
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
    topics: z
      .array(z.string({ required_error: 'Topics is required!' }))
      .optional(),
    level: z.string({ required_error: 'Course level is required!' }).optional(),
    language: z
      .string({ required_error: 'Course language is required!' })
      .optional(),
    audience: z
      .array(z.string({ required_error: 'Course audience is required!' }))
      .optional(),
    objectives: z
      .array(z.string({ required_error: 'Course objectives is required!' }))
      .optional(),
    prerequisites: z
      .string({ required_error: 'Course prerequisites is required!' })
      .optional(),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number')
      .optional(),
    description: z
      .string({ required_error: 'Course description is required!' })
      .optional(),
    hasCertificate: z
      .boolean({ required_error: 'Course hasCertificate is required!' })
      .optional(),
  }),
});

const changedStatusValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(CoursesStatus),
  }),
});

const assignCourseValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
  }),
});

export const CourseValidation = {
  createValidationSchema,
  updateValidationSchema,
  changedStatusValidationSchema,
  assignCourseValidationSchema,
};
