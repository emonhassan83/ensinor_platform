import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author id is required' })
      .uuid('author id must be a valid UUID'),
    courseId: z
      .string({ required_error: 'Course id is required' })
      .uuid('course id must be a valid UUID'),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    completedRate: z
      .number({ required_error: 'Enrolled course completedRate is required!' })
      .optional(),
    courseMark: z
      .number({ required_error: 'Enrolled course courseMark is required!' })
      .optional(),
    grade: z
      .string({ required_error: 'Enrolled course grade is required!' })
      .optional(),
    learningTime: z
      .number({ required_error: 'Enrolled course learningTime is required!' })
      .optional(),
    isCompleted: z
      .boolean({ required_error: 'Enrolled course isCompleted is required!' })
      .optional(),
  }),
});

export const EnrolledCourseValidation = {
  createValidationSchema,
  updateValidationSchema,
};
