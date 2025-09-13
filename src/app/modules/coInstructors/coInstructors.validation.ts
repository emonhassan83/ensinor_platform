import { Permission } from '@prisma/client';
import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    courseId: z
      .string({ required_error: 'Course is required' })
      .uuid('course must be a valid UUID'),
    invitedById: z
      .string({ required_error: 'Invited by user is required' })
      .uuid('invitedById must be a valid UUID'),
    coInstructorId: z
      .string({ required_error: 'Co instructor is required' })
      .uuid('coInstructorId must be a valid UUID'),
    permissions: z.array(z.nativeEnum(Permission)),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    permissions: z.array(z.nativeEnum(Permission)),
  }),
});

export const CoInstructorValidation = {
  createValidationSchema,
  updateValidationSchema,
};
