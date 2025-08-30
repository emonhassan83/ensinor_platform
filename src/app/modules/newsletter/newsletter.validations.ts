import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Newsletter email is required' }),
    recurrence: z.string({ required_error: 'Newsletter recurrence is required' }),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Newsletter email is required' }).optional(),
    recurrence: z
      .string({ required_error: 'Newsletter recurrence is required' })
      .optional(),
  }),
});

export const NewsletterValidation = {
  createValidationSchema,
  updateValidationSchema,
};
