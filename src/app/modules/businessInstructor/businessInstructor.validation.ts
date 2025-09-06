import { z } from 'zod';

const updateValidationSchema = z.object({
  body: z.object({
    user: z
      .object({
        name: z.string().optional(),
        contactNo: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        bio: z.string().optional(),
        dateOfBirth: z.string().optional(),
        photoUrl: z.string().url().optional(),
      })
      .optional(),

    businessInstructor: z
      .object({
        designation: z.string().optional(),
        university: z.string().optional(),
        session: z.string().optional(),
        subjects: z.string().optional(),
        linkedIn: z.string().url().optional(),
        facebook: z.string().url().optional(),
        twitter: z.string().url().optional(),
        instagram: z.string().url().optional(),
        website: z.string().url().optional(),
      })
      .optional(),
  }),
});

export const BusinessInstructorValidation = {
  updateValidationSchema,
};
