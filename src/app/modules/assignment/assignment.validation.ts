import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    courseId: z
      .string({ required_error: 'Course is required' })
      .uuid('course must be a valid UUID'),
    title: z.string({ required_error: 'Assignment title is required!' }),
    type: z.string({ required_error: 'Assignment type is required!' }),
    lesson: z.number({ required_error: 'Assignment lesson is required!' }).optional(),
    description: z.string({
      required_error: 'Assignment description is required!',
    }),
    fileUrl: z
      .string({ required_error: 'Assignment fileUrl is required!' })
      .optional(),
    marks: z.number({ required_error: 'Assignment marks is required!' }),
    deadline: z
      .string({ required_error: 'Assignment deadline is required!' })
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ required_error: 'Assignment title is required!' })
      .optional(),
    description: z
      .string({ required_error: 'Assignment description is required!' })
      .optional(),
    fileUrl: z
      .string({ required_error: 'Assignment fileUrl is required!' })
      .optional(),
    marks: z
      .number({ required_error: 'Assignment marks is required!' })
      .optional(),
    deadline: z
      .string({ required_error: 'Assignment deadline is required!' })
      .optional(),
  }),
});

export const AssignmentValidation = {
  createValidationSchema,
  updateValidationSchema,
};
