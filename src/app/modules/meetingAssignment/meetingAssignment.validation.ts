import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    authorId: z.string().uuid({ message: "Author must be a valid UUID" }),
    modelType: z.enum(["course", "event", "user"]),
    courseId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    zoomMeetingId: z.string().uuid({ message: "Zoom meeting ID required" }),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    modelType: z.enum(["course", "event", "user"]).optional(),
    courseId: z.string().uuid().optional(),
    eventId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    zoomMeetingId: z.string().uuid().optional(),
  }),
});

export const MeetingAssignmentValidation = {
  createValidationSchema,
  updateValidationSchema,
};
