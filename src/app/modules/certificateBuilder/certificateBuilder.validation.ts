import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author id is required' })
      .uuid('author id must be a valid UUID'),
    company: z
      .string({ required_error: 'Company name is required' })
      .optional(),
  }),
});

export const CertificateRequestValidation = {
  createValidationSchema,
};
