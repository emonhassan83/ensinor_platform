import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    question: z.string({ required_error: 'FAQ question is required' }),
    answer: z.string({ required_error: 'FAQ answer is required' }),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    question: z.string({ required_error: 'FAQ question is required' }).optional(),
    answer: z.string({ required_error: 'FAQ answer is required' }).optional(),
  }),
});

export const FaqValidation = {
  createValidationSchema,
  updateValidationSchema,
};
