import { NewsletterCategory, RecurrenceType } from '@prisma/client';
import { z } from 'zod';

const subscribeValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Newsletter email is required' }),
    category: z
      .array(z.nativeEnum(NewsletterCategory), {
        required_error: 'Newsletter category is required',
      })
      .nonempty({ message: 'At least one category must be selected' }),
    recurrence: z.nativeEnum(RecurrenceType),
  }),
});

const unsubscribeValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Newsletter email is required' }),
  }),
});

const changeSubscriberValidationSchema = z.object({
  body: z.object({
    email: z.string({ required_error: 'Newsletter email is required' }),
    category: z
      .array(z.nativeEnum(NewsletterCategory), {
        required_error: 'Newsletter category is required',
      })
      .nonempty({ message: 'At least one category must be selected' })
      .optional(),
    recurrence: z.nativeEnum(RecurrenceType).optional(),
  }),
});

const createValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Newsletter title is required' }),
    content: z.string({ required_error: 'Newsletter content is required' }),
    category: z.nativeEnum(NewsletterCategory),
    scheduleDate: z.string().optional(),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    title: z.string({ required_error: 'Newsletter title is required' }).optional(),
    content: z.string({ required_error: 'Newsletter content is required' }).optional(),
    category: z.nativeEnum(NewsletterCategory).optional(),
    scheduleDate: z.date().optional(),
  }),
});

export const NewsletterValidation = {
  subscribeValidationSchema,
  unsubscribeValidationSchema,
  changeSubscriberValidationSchema,
  createValidationSchema,
  updateValidationSchema
};
