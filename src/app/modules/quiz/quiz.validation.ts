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
    title: z.string({ required_error: 'Quiz title is required!' }),
    type: z.string({ required_error: 'Quiz type is required!' }),
    lesson: z.number({ required_error: 'Quiz lesson is required!' }).optional(),
    passingScore: z.number({
      required_error: 'Quiz passing score is required!',
    }),
    attemptAllow: z.number({
      required_error: 'Quiz attempt allow is required!',
    }),
    timeLimit: z
      .number({ required_error: 'Quiz time limit is required!' })
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Quiz title is required!' }).optional(),
    type: z.string({ required_error: 'Quiz type is required!' }).optional(),
    lesson: z.number({ required_error: 'Quiz lesson is required!' }).optional(),
    passingScore: z
      .number({ required_error: 'Quiz passing score is required!' })
      .optional(),
    attemptAllow: z
      .number({ required_error: 'Quiz attempt allow is required!' })
      .optional(),
    timeLimit: z
      .number({ required_error: 'Quiz time limit is required!' })
      .optional(),
  }),
});

export const QuizValidation = {
  createValidationSchema,
  updateValidationSchema,
};
