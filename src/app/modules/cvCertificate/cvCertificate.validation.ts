import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    cvId: z
      .string({ required_error: 'CV id is required' })
      .uuid('CV id must be a valid UUID'),
    instituteName: z.string({
      required_error: 'CV certificate instituteName is required',
    }),
    degree: z.string({
      required_error: 'CV certificate degree is required!',
    }),
    credentialId: z.string({
      required_error: 'CV certificate credentialId is required!',
    }),
    file: z.string({
      required_error: 'CV certificate file is required!',
    }).optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
       instituteName: z.string({
      required_error: 'CV certificate instituteName is required',
    }).optional(),
    degree: z.string({
      required_error: 'CV certificate degree is required!',
    }).optional(),
    credentialId: z.string({
      required_error: 'CV certificate credentialId is required!',
    }).optional(),
    file: z.string({
      required_error: 'CV certificate file is required!',
    }).optional(),
  }),
});

export const CVCertificateValidation = {
  createValidationSchema,
  updateValidationSchema,
};
