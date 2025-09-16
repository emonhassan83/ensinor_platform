import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    eventId: z
      .string({ required_error: 'Event is required' })
      .uuid('event must be a valid UUID'),
    userId: z
      .string({ required_error: 'User is required' })
      .uuid('user must be a valid UUID'),
    name: z.string({ required_error: 'name is required!' }),
    phone: z.string({
      required_error: 'Event booking phone is required!',
    }),
    email: z.string({ required_error: 'Event booking email is required!' }),
    organization: z.string({
      required_error: 'Event booking organization is required!',
    }),
    profession: z.string({
      required_error: 'Event booking profession is required!',
    }),
    city: z.string({ required_error: 'Event booking city is required!' }),
    country: z.string({ required_error: 'Event booking country is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'name is required!' }).optional(),
    phone: z
      .string({
        required_error: 'Event booking phone is required!',
      })
      .optional(),
    email: z
      .string({ required_error: 'Event booking email is required!' })
      .optional(),
    organization: z
      .string({ required_error: 'Event booking organization is required!' })
      .optional(),
    profession: z
      .string({ required_error: 'Event booking profession is required!' })
      .optional(),
    city: z
      .string({ required_error: 'Event booking city is required!' })
      .optional(),
    country: z
      .string({ required_error: 'Event booking country is required!' })
      .optional(),
  }),
});

export const EventValidation = {
  createValidationSchema,
  updateValidationSchema,
};
