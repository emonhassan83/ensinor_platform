import { z } from 'zod';

/* -------------------------
   LESSON VALIDATION
-------------------------- */

// Create Lesson Schema
const lessonSchema = z.object({
  sectionId: z
    .string({ required_error: 'Course section is required' })
    .uuid('course section must be a valid UUID').optional(),
  serial: z.number({ required_error: 'Lesson serial is required!' }),
  title: z.string({ required_error: 'Lesson title is required!' }),
  description: z.string({
    required_error: 'Lesson description is required!',
  }),
type: z.enum(['video', 'article', 'presentation', 'document', 'audio']),
  media: z.string({ required_error: 'Course lesson media is required!' }),
  duration: z
    .number({
      required_error: 'Course content duration is required!',
    })
    .optional(),
});

// Wrap for request validation
const createLessonValidationSchema = z.object({
  body: lessonSchema,
});

// Update Lesson Schema
const updateLessonValidationSchema = z.object({
  body: lessonSchema.partial(),
});

/* -------------------------
   SECTION VALIDATION
-------------------------- */

const sectionSchema = z.object({
  title: z.string({ required_error: 'Section title is required!' }),
  description: z.string().optional(),
  lesson: z.array(lessonSchema),
});

const createSectionValidationSchema = z.object({
  body: z.object({
    courseId: z.string().uuid({ message: 'Course must be a valid UUID' }),
    section: z.array(sectionSchema),
  }),
});

const updateSectionValidationSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    description: z.number().optional(),
  }),
});

/* -------------------------
   EXPORT
-------------------------- */

export const CourseContentValidation = {
  createSectionValidationSchema,
  updateSectionValidationSchema,
  createLessonValidationSchema,
  updateLessonValidationSchema,
};
