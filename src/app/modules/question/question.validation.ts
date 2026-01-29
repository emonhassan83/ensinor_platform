import { z } from 'zod';

const optionCreateSchema = z.object({
  body: z.object({
    questionId: z
      .string({
        required_error: 'Question id id required !',
      })
      .uuid({ message: 'Invalid UUID' }),
    options: z.array(
      z.object({
        optionLevel: z
          .string({ required_error: 'optionLevel is required' })
          .min(1, 'optionLevel cannot be empty'),
        optionText: z
          .string({ required_error: 'optionText is required' })
          .min(1, 'optionText cannot be empty'),
        isCorrect: z.boolean({ required_error: 'isCorrect is required' }),
      })
    ).optional(),
  }),
});

const optionCreate = z.object({
  optionLevel: z
    .string({ required_error: 'optionLevel is required' })
    .min(1, 'optionLevel cannot be empty'),
  optionText: z
    .string({ required_error: 'optionText is required' })
    .min(1, 'optionText cannot be empty'),
  isCorrect: z.boolean({ required_error: 'isCorrect is required' }),
}).optional();

const optionUpdateSchema = z.object({
  body: z.object({
    optionLevel: z.string().optional(),
    optionText: z.string().optional(),
    isCorrect: z.boolean().optional(),
  }),
});

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    quizId: z
      .string({
        required_error: 'Quiz id id required !',
      })
      .uuid({ message: 'Invalid UUID' }),
    name: z.string({ required_error: 'Question name is required' }),
    type: z.string({ required_error: 'Question type is required' }),
    point: z.number({ required_error: 'Question point is required' }),
    expectedAnswer: z
      .array(
        z
          .string({ required_error: 'Question expected answer is required' })
          .min(1),
      )
      .optional(),
    feedback: z.string({ required_error: 'Question feedback is required' }).optional(),
    options: z
      .array(optionCreate, {
        required_error: 'Options are required',
      })
      .min(2, 'At least two option is required'),
  }).optional(),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Quiz name is required!' }).optional(),
    type: z.string({ required_error: 'Question type is required' }).optional(),
    point: z
      .number({ required_error: 'Question point is required' })
      .optional(),
    expectedAnswer: z
      .array(
        z
          .string({ required_error: 'Question expected answer is required' })
          .min(1),
      )
      .optional(),
    feedback: z
      .string({ required_error: 'Question feedback is required' })
      .optional(),
    options: z
      .array(optionCreateSchema, {
        required_error: 'Options are required',
      })
      .min(2, 'At least two option is required')
      .optional(),
  }),
});

export const QuestionValidation = {
  optionCreateSchema,
  optionUpdateSchema,
  createValidationSchema,
  updateValidationSchema,
};
