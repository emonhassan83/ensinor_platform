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
  }),
});

export const CompanyAdminValidation = {
  updateValidationSchema,
};
