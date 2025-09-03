import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    senderId: z
      .string({ required_error: 'senderId is required' })
      .uuid('senderId must be a valid UUID'),
    MessageId: z
      .string({ required_error: 'MessageId is required' })
      .uuid('MessageId must be a valid UUID'),
    receiverId: z
      .string({ required_error: 'receiverId is required' })
      .uuid('receiverId must be a valid UUID')
      .optional(),
    text: z.string({ required_error: 'Message text is required!' }).optional(),
    imageUrl: z
      .array(z.string({ required_error: 'Message groupImage is required!' }))
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    text: z.string({ required_error: 'Message text is required!' }).optional(),
    imageUrl: z
      .array(z.string({ required_error: 'Message groupImage is required!' }))
      .optional(),
  }),
});

export const MessageValidation = {
  createValidationSchema,
  updateValidationSchema,
};
