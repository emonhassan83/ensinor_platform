import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    eventScheduleId: z
      .string({ required_error: 'Event schedule is required' })
      .uuid('eventScheduleId must be a valid UUID'),
    name: z.string({ required_error: 'name is required!' }),
    photo: z.string({
      required_error: 'Speaker photo is required!',
    }).optional(),
    profession: z.string({ required_error: 'profession is required!' })
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'name is required!' }).optional(),
    photo: z.string({
      required_error: 'Speaker photo is required!',
    }).optional(),
    profession: z.string({ required_error: 'profession is required!' }).optional()
  }),
});

export const EventSpeakerValidation = {
  createValidationSchema,
  updateValidationSchema,
};
