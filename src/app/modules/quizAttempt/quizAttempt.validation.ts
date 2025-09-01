import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    quizId: z
      .string({ required_error: 'Quiz id is required' })
      .uuid('quiz id must be a valid UUID'),
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    timeTaken: z
      .string({ required_error: 'Quiz attempt timeTaken is required!' })
      .optional(),
    marksObtained: z
      .number({ required_error: 'Quiz attempt marksObtained is required!' })
      .optional(),
    totalMarks: z
      .number({ required_error: 'Quiz attempt totalMarks is required!' })
      .optional(),
    grade: z
      .string({ required_error: 'Quiz attempt grade is required!' })
      .optional(),
    correctRate: z
      .number({ required_error: 'Quiz attempt correctRate is required!' })
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    timeTaken: z
      .string({ required_error: 'Quiz attempt timeTaken is required!' })
      .optional(),
    marksObtained: z
      .number({ required_error: 'Quiz attempt marksObtained is required!' })
      .optional(),
    totalMarks: z
      .number({ required_error: 'Quiz attempt totalMarks is required!' })
      .optional(),
    grade: z
      .string({ required_error: 'Quiz attempt grade is required!' })
      .optional(),
    correctRate: z
      .number({ required_error: 'Quiz attempt correctRate is required!' })
      .optional(),
  }),
});

export const QuizAttemptValidation = {
  createValidationSchema,
  updateValidationSchema,
};
