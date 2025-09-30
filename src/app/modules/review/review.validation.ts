import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    modelType: z.enum(['course', 'bundle_course'], {
      required_error: 'Review model type is required!',
      invalid_type_error:
        'Review model type must be either course or bundle_course',
    }),
    courseId: z
      .string({ required_error: 'Reference is required' })
      .uuid('reference must be a valid UUID')
      .optional(),
    courseBundleId: z
      .string({ required_error: 'Reference is required' })
      .uuid('reference must be a valid UUID')
      .optional(),
    rating: z.number({ required_error: 'Review rating is required!' }),
    comment: z.string({ required_error: 'Review comment is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    rating: z
      .number({ required_error: 'Review rating is required!' })
      .optional(),
    comment: z
      .string({ required_error: 'Review comment is required!' })
      .optional(),
  }),
});

export const ReviewValidation = {
  createValidationSchema,
  updateValidationSchema,
};
