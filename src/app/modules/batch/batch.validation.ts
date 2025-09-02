import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    title: z.string({ required_error: 'Batch title is required!' }),
    description: z.string({ required_error: 'Batch description is required!' }),
    logo: z.string({ required_error: 'Batch logo is required!' }).optional(),
    category: z.string({ required_error: 'Batch category is required!' }),
    rarity: z.string({ required_error: 'Batch rarity is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Batch title is required!' }).optional(),
    description: z
      .string({ required_error: 'Batch description is required!' })
      .optional(),
    logo: z.string({ required_error: 'Batch logo is required!' }).optional(),
    category: z
      .string({ required_error: 'Batch category is required!' })
      .optional(),
    rarity: z
      .string({ required_error: 'Batch rarity is required!' })
      .optional(),
  }),
});

export const BatchValidation = {
  createValidationSchema,
  updateValidationSchema,
};
