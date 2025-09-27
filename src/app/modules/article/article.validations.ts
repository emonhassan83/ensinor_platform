import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Article name is required' })
      .uuid('receiver must be a valid UUID'),
    title: z.string({ required_error: 'Article title is required' }),
    category: z.string({ required_error: 'Article category is required' }),
    description: z.string({
      required_error: 'Article description is required',
    }),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Article title is required' }).optional(),
    category: z
      .string({ required_error: 'Article category is required' })
      .optional(),
    thumbnail: z
      .string({ required_error: 'Article thumbnail is required' })
      .optional(),
    description: z
      .string({
        required_error: 'Article description is required',
      })
      .optional(),
  }),
});

export const ArticleValidation = {
  createValidationSchema,
  updateValidationSchema,
};
