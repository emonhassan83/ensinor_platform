import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required!' }),
    logo: z.string({ required_error: 'Logo is required!' }).optional(),
    audience: z.enum(['company_admin', 'student'], {
      required_error: 'Audience is required!',
      invalid_type_error: 'Audience must be either "company_admin" or "student"',
    }),
    features: z.array(z.string(), {
      required_error: 'Features are required!',
    }).nonempty('At least one feature is required!'),
    billingCycle: z.enum(['monthly', 'halfYearly', 'annually'], {
      required_error: 'Billing cycle is required!',
      invalid_type_error:
        'Billing cycle must be "monthly", "halfYearly", or "annually"',
    }),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number')
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    logo: z.string().optional(),
    audience: z
      .enum(['company_admin', 'student'])
      .optional(),
    features: z.array(z.string()).optional(),
    billingCycle: z
      .enum(['monthly', 'halfYearly', 'annually'])
      .optional(),
    price: z.number().int().nonnegative().optional()
  }),
});

export const PackageValidation = {
  createValidationSchema,
  updateValidationSchema,
};
