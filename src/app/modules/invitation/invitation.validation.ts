import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z.string({ required_error: 'User ID is required!' }),
    departmentId: z.string({ required_error: 'Department ID is required!' }),
    name: z.string({ required_error: 'Name is required!' }),
    groupName: z.string().optional(),
    email: z
      .string({ required_error: 'Email is required!' })
      .email('Invalid email format'),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    groupName: z.string().optional(),
    email: z.string().email('Invalid email format').optional(),
  }),
});

export const InvitationValidation = {
  createValidationSchema,
  updateValidationSchema,
};
