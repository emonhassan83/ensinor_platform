import { EventType, PlatformType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'Author is required' })
      .uuid('author must be a valid UUID'),
    companyId: z
      .string({ required_error: 'Company is required' })
      .uuid('company must be a valid UUID')
      .optional(),
    title: z.string({ required_error: 'Title is required!' }),
    type: z.nativeEnum(EventType),
    platform: z.nativeEnum(PlatformType),
    slogan: z.string({
      required_error: 'Short slogan is required!',
    }),
    category: z.string({ required_error: 'Category is required!' }),
    language: z.string({ required_error: 'Language is required!' }),
    thumbnail: z
      .string({ required_error: 'Event thumbnail is required!' })
      .optional(),
    organizedBy: z.string({ required_error: 'Event organizedBy is required!' }),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number'),
    location: z.string({ required_error: 'Event location is required!' }),
    date: z.string({ required_error: 'Event date is required!' }),
    startTime: z.string({ required_error: 'Event startTime is required!' }),
    endTime: z.string({ required_error: 'Event endTime is required!' }),
    description: z.string({
      required_error: 'Event description is required!',
    }),
    speakerSlogan: z.string({
      required_error: 'Event speakerSlogan is required!',
    }),
    scheduleSlogan: z.string({
      required_error: 'Event scheduleSlogan is required!',
    }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Title is required!' }).optional(),
    type: z.nativeEnum(EventType).optional(),
    slogan: z
      .string({
        required_error: 'Short slogan is required!',
      })
      .optional(),
    category: z.string({ required_error: 'Type is required!' }).optional(),
    language: z.string({ required_error: 'Language is required!' }).optional(),
    thumbnail: z
      .string({ required_error: 'Event thumbnail is required!' })
      .optional(),
    organizedBy: z
      .string({ required_error: 'Event organizedBy is required!' })
      .optional(),
    price: z
      .number({ required_error: 'Price is required!' })
      .int('Price must be an integer')
      .nonnegative('Price must be a positive number')
      .optional(),
    location: z
      .string({ required_error: 'Event location is required!' })
      .optional(),
    date: z.string({ required_error: 'Event date is required!' }).optional(),
    startTime: z
      .string({ required_error: 'Event startTime is required!' })
      .optional(),
    endTime: z
      .string({ required_error: 'Event endTime is required!' })
      .optional(),
    description: z
      .string({
        required_error: 'Event description is required!',
      })
      .optional(),
    speakerSlogan: z
      .string({
        required_error: 'Event speakerSlogan is required!',
      })
      .optional(),
    scheduleSlogan: z
      .string({
        required_error: 'Event scheduleSlogan is required!',
      })
      .optional(),
  }),
});

export const EventValidation = {
  createValidationSchema,
  updateValidationSchema,
};
