import { CertificateRequestStatus } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    courseId: z
      .string({ required_error: 'Course id is required' })
      .uuid('course id must be a valid UUID'),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    status: z.nativeEnum(CertificateRequestStatus).optional()
  }),
});

export const CertificateRequestValidation = {
  createValidationSchema,
  updateValidationSchema,
};
