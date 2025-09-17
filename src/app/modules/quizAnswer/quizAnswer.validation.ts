import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    attemptId: z
      .string({ required_error: 'attempt id is required' })
      .uuid('attempt id must be a valid UUID'),
    questionId: z
      .string({ required_error: 'question id is required' })
      .uuid('question id must be a valid UUID'),
    optionId: z
      .string({ required_error: 'option id is required' })
      .uuid('option id must be a valid UUID'),
    isCorrect: z
      .boolean({ required_error: 'isCorrect is required' })
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    optionId: z
      .string({ required_error: 'option id is required' })
      .uuid('option id must be a valid UUID').optional(),
    isCorrect: z
      .boolean({ required_error: 'isCorrect is required' }).optional()
  }),
});

export const QuizAnswerValidation = {
  createValidationSchema,
  updateValidationSchema,
};
