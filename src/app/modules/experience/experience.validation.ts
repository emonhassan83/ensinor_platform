import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    cvId: z
      .string({ required_error: 'CV id is required' })
      .uuid('CV id must be a valid UUID'),
    companyName: z.string({
      required_error: 'CV experience companyName is required',
    }),
    designation: z.string({
      required_error: 'CV experience designation is required!',
    }),
    jobType: z.string({
      required_error: 'CV experience jobType is required!',
    }),
    startTime: z.string({
      required_error: 'CV experience startTime is required!',
    }),
    endTime: z.string({
      required_error: 'CV experience endTime is required!',
    }),
    description: z.string({
      required_error: 'CV experience description is required!',
    }),
    skills: z.array(
      z.string({
        required_error: 'CV experience skills is required!',
      }),
    ),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    companyName: z
      .string({
        required_error: 'CV experience companyName is required',
      })
      .optional(),
    designation: z
      .string({
        required_error: 'CV experience designation is required!',
      })
      .optional(),
    jobType: z
      .string({
        required_error: 'CV experience jobType is required!',
      })
      .optional(),
    startTime: z
      .string({
        required_error: 'CV experience startTime is required!',
      })
      .optional(),
    endTime: z
      .string({
        required_error: 'CV experience endTime is required!',
      })
      .optional(),
    description: z
      .string({
        required_error: 'CV experience description is required!',
      })
      .optional(),
    skills: z
      .array(
        z.string({
          required_error: 'CV experience skills is required!',
        }),
      )
      .optional(),
  }),
});

export const ExperienceValidation = {
  createValidationSchema,
  updateValidationSchema,
};
