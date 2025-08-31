import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    courseId: z
      .string({ required_error: 'Course is required' })
      .uuid('course must be a valid UUID'),
    title: z.string({ required_error: 'Title is required!' }),
    video: z
      .string({ required_error: 'Course content video is required!' })
      .optional(),
    duration: z.number({
      required_error: 'Course content duration is required!',
    }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required!' }).optional(),
    video: z
      .string({ required_error: 'Course content video is required!' })
      .optional(),
    duration: z
      .number({
        required_error: 'Course content duration is required!',
      })
      .optional(),
  }),
});

export const CourseContentValidation = {
  createValidationSchema,
  updateValidationSchema,
};
