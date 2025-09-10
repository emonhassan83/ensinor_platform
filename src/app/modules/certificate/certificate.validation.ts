import { CertificateRequestStatus } from '@prisma/client';
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
    company: z.string({
      required_error: 'Certificate company is required!',
    }),
    student: z.string({
      required_error: 'Certificate student is required!',
    }),
    courseName: z.string({
      required_error: 'Certificate courseName is required!',
    }),
    instructor: z.string({
      required_error: 'Certificate instructor is required!',
    }),
    studyHour: z.number({
      required_error: 'Certificate studyHour is required!',
    }),
    topics: z.array(
      z.string({
        required_error: 'Certificate request isCompleted is required!',
      }),
    ),
    completeDate: z.string({
      required_error: 'Certificate completeDate is required!',
    }),
    reference: z.string({
      required_error: 'Certificate reference is required!',
    }),
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
    logo: z
      .string({
        required_error: 'Certificate logo is required!',
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
    signature: z
      .string({
        required_error: 'Certificate signature is required!',
      })
      .optional(),
  }),
});

export const CertificateValidation = {
  createValidationSchema,
  updateValidationSchema,
};
