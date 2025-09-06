import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Department author is required' }),
    name: z.string({ required_error: 'Department name is required' }),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Department name is required' })
      .optional(),
    image: z
      .string({ required_error: 'Department image is required' })
      .optional(),
  }),
});

export const DepartmentValidation = {
  createValidationSchema,
  updateValidationSchema,
};
