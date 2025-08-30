import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Support name is required' }),
    email: z.string({ required_error: 'Support email is required' }),
    message: z.string({ required_error: 'Support message is required' }),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Support name is required' }).optional(),
    email: z.string({ required_error: 'Support email is required' }).optional(),
    message: z
      .string({ required_error: 'Support message is required' })
      .optional(),
  }),
});

export const SupportValidation = {
  createValidationSchema,
  updateValidationSchema,
};
