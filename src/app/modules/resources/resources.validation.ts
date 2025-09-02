import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'name is required' }),
    modelType: z.string({ required_error: 'Wishlist modelType is required!' }),
    referenceId: z
      .string({ required_error: 'Reference is required' })
      .uuid('reference must be a valid UUID'),
    file: z
      .string({ required_error: 'file is required' }).optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'name is required' }).optional(),
    file: z
      .string({ required_error: 'file is required' }).optional(),
  }),
});



export const ResourceValidation = {
  createValidationSchema,
  updateValidationSchema
};
