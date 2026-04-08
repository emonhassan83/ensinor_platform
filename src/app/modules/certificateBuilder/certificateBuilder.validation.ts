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
    logoHeight: z
      .number({ required_error: 'Logo height is required' })
      .optional(),
    logoWidth: z
      .number({ required_error: 'Logo width is required' })
      .optional(),
    mainLogoHeight: z
      .number({ required_error: 'Main logo height is required' })
      .optional(),
    mainLogoWidth: z
      .number({ required_error: 'Main logo width is required' })
      .optional(),
    isVisibleTopics: z
      .boolean({ required_error: 'Is visible topics is required' })
      .optional(),
    authorProfession: z
      .string({ required_error: 'Author profession is required' })
      .optional(),
  }),
});

export const CertificateRequestValidation = {
  createValidationSchema,
};
