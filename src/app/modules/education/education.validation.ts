import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    cvId: z
      .string({ required_error: 'CV id is required' })
      .uuid('CV id must be a valid UUID'),
    institution: z
      .string({ required_error: 'CV education institution is required' }),
    degree: z.string({
      required_error: 'CV education degree is required!',
    }),
    location: z.string({
      required_error: 'CV education location is required!',
    }),
    type: z.string({
      required_error: 'CV education result type is required!',
    }).optional(),
    result: z.string({
      required_error: 'CV education result is required!',
    }).optional(),
    startTime: z.string({
      required_error: 'CV education startTime is required!',
    }),
    endTime: z.string({
      required_error: 'CV education endTime is required!',
    }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    institution: z
      .string({ required_error: 'CV education institution is required' }).optional(),
    degree: z.string({
      required_error: 'CV education degree is required!',
    }).optional(),
    location: z.string({
      required_error: 'CV education location is required!',
    }).optional(),
    result: z.string({
      required_error: 'CV education result is required!',
    }).optional(),
    startTime: z.string({
      required_error: 'CV education startTime is required!',
    }),
    endTime: z.string({
      required_error: 'CV education endTime is required!',
    }).optional(),
    type: z.string({
      required_error: 'CV education type is required!',
    }).optional(),
  }),
});

export const EducationValidation = {
  createValidationSchema,
  updateValidationSchema,
};
