import { ChatType } from '@prisma/client';
import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    type: z.nativeEnum(ChatType),
    groupName: z
      .string({ required_error: 'Chat groupName is required!' })
      .optional(),
    groupImage: z
      .string({ required_error: 'Chat groupImage is required!' })
      .optional(),
    participants: z.array(
      z.object({
        userId: z.string({ required_error: "Participant userId is required" }),
      })
    ).min(1, "At least one participant is required"),
  }),
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
