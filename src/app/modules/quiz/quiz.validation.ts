import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    courseId: z
      .string({ required_error: 'Course is required' })
      .uuid('course must be a valid UUID'),
    deadline: z.string({ required_error: 'Quiz deadline is required!' }),
    time: z.string({
      required_error: 'Quiz time is required!',
    }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    deadline: z.string({ required_error: 'Quiz deadline is required!' }).optional(),
    time: z.string({
      required_error: 'Quiz time is required!',
    }).optional(),
  }),
});

export const QuizValidation = {
  createValidationSchema,
  updateValidationSchema,
};
