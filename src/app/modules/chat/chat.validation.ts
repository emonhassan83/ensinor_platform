import { ChatType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    type: z.nativeEnum(ChatType),
    groupName: z.string().optional(),
    groupImage: z.string().optional(),
    participants: z
      .array(
        z.object({
          userId: z.string().uuid('Participant userId must be valid UUID'),
        }),
      )
      .min(1, 'At least one participant is required'),
  }),
}).superRefine((data, ctx) => {
  if (data.body.type === 'private' && data.body.participants.length !== 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Private chat must have exactly 2 participants',
      path: ['participants'],
    });
  }
});


// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    groupName: z
      .string({ required_error: 'Chat groupName is required!' })
      .optional(),
    groupImage: z
      .string({ required_error: 'Chat groupImage is required!' })
      .optional(),
  }),
});

const createChatParticipant = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    chatId: z
      .string({ required_error: 'Chat id is required' })
      .uuid('chat id must be a valid UUID'),
  }),
});

export const ChatValidation = {
  createValidationSchema,
  updateValidationSchema,
  createChatParticipant,
};
