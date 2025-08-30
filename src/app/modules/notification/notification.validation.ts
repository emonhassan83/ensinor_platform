import { z } from 'zod';
import { NotificationModeType } from '@prisma/client';

const createValidation = z.object({
  body: z.object({
    receiver: z
      .string({ required_error: 'receiver is required' })
      .uuid('receiver must be a valid UUID'),
    reference: z.string().uuid('reference must be a valid UUID').optional(),
    modeType: z.nativeEnum(NotificationModeType, {
      required_error: 'modeType is required',
      invalid_type_error: 'Invalid modeType value',
    }),
    message: z
      .string({ required_error: 'message is required' })
      .min(1, 'message cannot be empty'),
    description: z.string().optional(),
  }),
});

const bulkCreateValidation = z.object({
  body: z.object({
    notifications: z
      .array(
        z.object({
          receiver: z.string().uuid('receiver must be a valid UUID'),
          reference: z
            .string()
            .uuid('reference must be a valid UUID')
            .optional(),
          modeType: z.nativeEnum(NotificationModeType),
          message: z.string().min(1, 'message cannot be empty'),
          description: z.string().optional(),
        }),
      )
      .min(1, 'At least one notification is required'),
  }),
});

const updateValidation = z.object({
  body: z.object({
    modeType: z.nativeEnum(NotificationModeType).optional(),
    message: z.string().min(1, 'message cannot be empty').optional(),
    description: z.string().optional(),
    read: z.boolean().optional(),
  }),
});

export const NotificationValidation = {
  createValidation,
  bulkCreateValidation,
  updateValidation,
};
