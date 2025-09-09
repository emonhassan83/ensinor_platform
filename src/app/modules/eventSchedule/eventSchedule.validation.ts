import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    eventId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    day: z.string({ required_error: 'day is required!' }),
    date: z.string({ required_error: 'Event date is required!' }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    day: z.string({ required_error: 'day is required!' }).optional(),
    date: z.string({ required_error: 'Event date is required!' }).optional(),
  }),
});

export const EventScheduleValidation = {
  createValidationSchema,
  updateValidationSchema,
};
