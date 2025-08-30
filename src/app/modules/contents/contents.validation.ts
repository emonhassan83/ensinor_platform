import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    createdById: z
      .string({ required_error: 'createdById is required' })
      .uuid('createdById must be a valid UUID'),
    aboutUs: z
      .string({ required_error: 'aboutUs is required' })
      .optional(),
    termsAndConditions: z
      .string({ required_error: 'termsAndConditions is required' })
      .optional(),
    privacyPolicy: z
      .string({ required_error: 'privacyPolicy is required' })
      .optional(),
    supports: z
      .string({ required_error: 'supports is required' })
      .optional(),

    customerLocation: z
      .string({ required_error: 'customerLocation is required' })
      .optional(),
    customerNumber: z
      .string({ required_error: 'customerNumber is required' })
      .regex(/^\+?[0-9\- ]+$/, 'customerNumber must be a valid phone number')
      .optional(),
    customerEmail: z
      .string({ required_error: 'customerEmail is required' })
      .email('customerEmail must be a valid email')
      .optional(),

    contractLocation: z
      .string({ required_error: 'contractLocation is required' })
      .optional(),
    contractNumber: z
      .string({ required_error: 'contractNumber is required' })
      .regex(/^\+?[0-9\- ]+$/, 'contractNumber must be a valid phone number')
      .optional(),
    contractEmail: z
      .string({ required_error: 'contractEmail is required' })
      .email('contractEmail must be a valid email')
      .optional(),

    officeLocation: z
      .string({ required_error: 'officeLocation is required' })
      .optional(),
    officeNumber: z
      .string({ required_error: 'officeNumber is required' })
      .regex(/^\+?[0-9\- ]+$/, 'officeNumber must be a valid phone number')
      .optional(),
    officeEmail: z
      .string({ required_error: 'officeEmail is required' })
      .email('officeEmail must be a valid email')
      .optional(),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    createdById: z
      .string({ required_error: 'createdById is required' })
      .uuid('createdById must be a valid UUID')
      .optional(),
    aboutUs: z.string().min(1, 'aboutUs cannot be empty').optional(),
    termsAndConditions: z
      .string()
      .min(1, 'termsAndConditions cannot be empty')
      .optional(),
    privacyPolicy: z
      .string()
      .min(1, 'privacyPolicy cannot be empty')
      .optional(),
    supports: z.string().min(1, 'supports cannot be empty').optional(),

    customerLocation: z.string().optional(),
    customerNumber: z
      .string()
      .regex(/^\+?[0-9\- ]+$/, 'customerNumber must be a valid phone number')
      .optional(),
    customerEmail: z
      .string()
      .email('customerEmail must be a valid email')
      .optional(),

    contractLocation: z.string().optional(),
    contractNumber: z
      .string()
      .regex(/^\+?[0-9\- ]+$/, 'contractNumber must be a valid phone number')
      .optional(),
    contractEmail: z
      .string()
      .email('contractEmail must be a valid email')
      .optional(),

    officeLocation: z.string().optional(),
    officeNumber: z
      .string()
      .regex(/^\+?[0-9\- ]+$/, 'officeNumber must be a valid phone number')
      .optional(),
    officeEmail: z
      .string()
      .email('officeEmail must be a valid email')
      .optional(),
  }),
});

export const contentsValidation = {
  createValidationSchema,
  updateValidationSchema,
};
