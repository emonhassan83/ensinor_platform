import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z.string({ required_error: "User ID is required!" }),
    name: z.string({ required_error: "Name is required!" }),
    organizationEmail: z.string().email({ message: "Invalid organization email!" }),
    companyType: z.string({ required_error: "Company type is required!" }),
    phoneNumber: z.string({ required_error: "Phone number is required!" }),
    role: z.string({ required_error: "Role is required!" }),
    companySize: z.number({ required_error: "Company size is required!" }),
    numberOfPeopleToTrain: z.number({ required_error: "Number of people to train is required!" }),
    trainingNeeds: z.number({ required_error: "Training needs is required!" }),
    description: z.string({ required_error: "Description is required!" }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    organizationEmail: z.string().email().optional(),
    companyType: z.string().optional(),
    phoneNumber: z.string().optional(),
    role: z.string().optional(),
    companySize: z.number().optional(),
    numberOfPeopleToTrain: z.number().optional(),
    trainingNeeds: z.number().optional(),
    description: z.string().optional()
  }),
});

export const CompanyRequestValidation = {
  createValidationSchema,
  updateValidationSchema,
};
