import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    enrolledCourseId: z
      .string({ required_error: 'Enrolled course id is required' })
      .uuid('enrolled course id must be a valid UUID'),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    company: z
      .string({
        required_error: 'Certificate company is required!',
      })
      .optional(),
    student: z
      .string({
        required_error: 'Certificate student is required!',
      })
      .optional(),
    courseName: z
      .string({
        required_error: 'Certificate courseName is required!',
      })
      .optional(),
    instructor: z
      .string({
        required_error: 'Certificate instructor is required!',
      })
      .optional(),
    studyHour: z
      .number({
        required_error: 'Certificate studyHour is required!',
      })
      .optional(),
    topics: z
      .array(
        z.string({
          required_error: 'Certificate request isCompleted is required!',
        }),
      )
      .optional(),
    completeDate: z
      .string({
        required_error: 'Certificate completeDate is required!',
      })
      .optional(),
    reference: z
      .string({
        required_error: 'Certificate reference is required!',
      })
      .optional(),
  }),
});

export const CertificateValidation = {
  createValidationSchema,
  updateValidationSchema,
};
