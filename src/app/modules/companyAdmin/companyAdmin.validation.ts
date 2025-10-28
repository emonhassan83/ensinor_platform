import { z } from 'zod';

const updateValidationSchema = z.object({
  body: z.object({
    user: z.object({
      name: z.string().optional(),
      contactNo: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
    }),
    company: z
      .object({
        name: z.string().optional(),
        industryType: z.string().optional(),
        color: z.string().optional(),
      })
      .optional(),
  }),
});

const changedBrandingValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    color: z.string().optional(),
  }),
});

export const CompanyAdminValidation = {
  updateValidationSchema,
  changedBrandingValidationSchema,
};
