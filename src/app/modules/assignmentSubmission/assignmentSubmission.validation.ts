import { CourseGrade } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    assignmentId: z
      .string({ required_error: 'Assignment is required' })
      .uuid('assignment must be a valid UUID'),
    userId: z
      .string({ required_error: 'user is required' })
      .uuid('user must be a valid UUID'),
    grade: z.nativeEnum(CourseGrade).optional(),
    feedback: z
      .date({ required_error: 'Assignment submission feedback is required!' })
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    grade: z.nativeEnum(CourseGrade).optional(),
    marksObtained: z
      .number({
        required_error: 'Assignment submission marksObtained is required!',
      })
      .optional(),
    feedback: z
      .string({ required_error: 'Assignment submission feedback is required!' })
      .optional(),
  }),
});

export const AssignmentSubmissionValidation = {
  createValidationSchema,
  updateValidationSchema,
};
