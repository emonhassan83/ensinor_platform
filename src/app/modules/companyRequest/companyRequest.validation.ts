import { CompanyType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required!' }),
    organizationEmail: z
      .string()
      .email({ message: 'Invalid organization email!' }),
    platformType: z.nativeEnum(CompanyType),
    phoneNumber: z.string({ required_error: 'Phone number is required!' }),
    companySize: z.string({ required_error: 'Company size is required!' }),
    numberOfPeopleToTrain: z.string({
      required_error: 'Number of people to train is required!',
    }),
    description: z.string({ required_error: 'Description is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    organizationEmail: z.string().email().optional(),
    platformType: z.nativeEnum(CompanyType).optional(),
    phoneNumber: z.string().optional(),
    companySize: z.string().optional(),
    numberOfPeopleToTrain: z.string().optional(),
    description: z.string().optional(),
  }),
});

export const CompanyRequestValidation = {
  createValidationSchema,
  updateValidationSchema,
};
