import { z } from 'zod';

const updateValidationSchema = z.object({
  body: z.object({
    user: z.object({
      name: z
        .string({
          required_error: 'Name is required!',
        })
        .optional(),
      contactNo: z
        .string({
          required_error: 'Contact Number is required!',
        })
        .optional(),
      city: z
        .string({
          required_error: 'City is required!',
        })
        .optional(),
      country: z
        .string({
          required_error: 'Country is required!',
        })
        .optional(),
      bio: z
        .string({
          required_error: 'Bio is required!',
        })
        .optional(),
      dateOfBirth: z
        .string({
          required_error: 'Date of Birth is required!',
        })
        .optional(),
    }),

    student: z.object({
      interests: z
        .array(
          z.string({
            required_error: 'Interests are required!',
          }),
        )
        .optional(),
      university: z
        .string({
          required_error: 'University is required!',
        })
        .optional(),
      session: z
        .string({
          required_error: 'Session is required!',
        })
        .optional(),
      subjects: z
        .string({
          required_error: 'Subjects are required!',
        })
        .optional(),
    }),
  }),
});

export const StudentValidation = {
  updateValidationSchema,
};
