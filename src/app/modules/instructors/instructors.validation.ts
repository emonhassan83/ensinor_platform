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
      photoUrl: z
        .string({
          required_error: 'Profile Photo URL is required!',
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

    instructor: z.object({
      designation: z
        .string({
          required_error: 'Designation is required!',
        })
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
          required_error: 'Subjects is required!',
        })
        .optional(),
      linkedIn: z
        .string({
          required_error: 'LinkedIn is required!',
        })
        .optional(),
      facebook: z
        .string({
          required_error: 'Facebook is required!',
        })
        .optional(),
      twitter: z
        .string({
          required_error: 'Twitter is required!',
        })
        .optional(),
      instagram: z
        .string({
          required_error: 'Instagram is required!',
        })
        .optional(),
      website: z
        .string({
          required_error: 'Website is required!',
        })
        .optional(),
    }),
  }),
});

export const InstructorValidation = {
  updateValidationSchema,
};
