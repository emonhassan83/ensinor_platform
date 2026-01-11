import { z } from 'zod';

// Zoom Account Create Validation
const createAccountValidation = z.object({
  body: z.object({
    userId: z.string({ required_error: 'User ID is required!' }).uuid('Invalid user ID'),
    accountEmail: z.string({ required_error: 'Zoom account email is required!' }).email('Invalid email format'),
    apiKey: z.string({ required_error: 'API Key is required!' }),
    apiSecret: z.string({ required_error: 'API Secret is required!' }),
    accessToken: z.string().optional(), // যদি OAuth token ব্যবহার করেন
  }),
})

// Zoom Account Update Validation
const updateAccountValidation = z.object({
  body: z.object({
    accountEmail: z.string().email('Invalid email format').optional(),
    apiKey: z.string().optional(),
    apiSecret: z.string().optional(),
    accessToken: z.string().optional(),
  }),
})

// Zoom Meeting Create Validation
const createMeetingValidation = z.object({
  body: z.object({
    userId: z.string({ required_error: 'User ID is required!' }).uuid('Invalid user ID'),
    zoomAccountId: z.string().uuid('Invalid Zoom Account ID').optional(),
    topic: z.string({ required_error: 'Meeting topic is required!' }).min(1),
    agenda: z.string().optional(),
    duration: z.number({ required_error: 'Duration is required!' }).int().positive().min(1).optional(),
    startTime: z.string({ required_error: 'Start time is required!' }).datetime({ message: 'Invalid ISO date' }).optional(),
    endTime: z.string().datetime().optional(),
    timezone: z.string().optional(),
    password: z.string().optional(),
  }),
});

// Zoom Meeting Update Validation
const updateMeetingValidation = z.object({
  body: z.object({
    topic: z.string().optional(),
    agenda: z.string().optional(),
    duration: z.string().optional(),
    startTime: z.string().optional(),
    endTime: z.string().optional(),
    password: z.string().optional(),
    startUrl: z.string().url('Invalid start URL').optional(),
    joinUrl: z.string().url('Invalid join URL').optional(),
  }),
})

export const ZoomValidation = {
  createAccountValidation,
  updateAccountValidation,
  createMeetingValidation,
  updateMeetingValidation
};
