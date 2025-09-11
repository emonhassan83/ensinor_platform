import { CourseGrade } from '@prisma/client';
import { z } from 'zod';

const gradeCreateSchema = z.object({
  body: z.object({
    gradingSystemId: z
      .string({
        required_error: 'Grading system id required !',
      })
      .uuid({ message: 'Invalid UUID' }),
    minScore: z.number({ required_error: 'minScore is required' }),
    maxScore: z.number({ required_error: 'maxScore is required' }),
    gradeLabel: z.nativeEnum(CourseGrade),
  }),
});

const gradeUpdateSchema = z.object({
  body: z.object({
    minScore: z.number({ required_error: 'minScore is required' }).optional(),
    maxScore: z.number({ required_error: 'maxScore is required' }).optional(),
    gradeLabel: z.nativeEnum(CourseGrade).optional(),
  }),
});

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    courseId: z
      .string({
        required_error: 'Course id required !',
      })
      .uuid({ message: 'Invalid UUID' }).optional(),
    authorId: z
      .string({
        required_error: 'Author id required !',
      })
      .uuid({ message: 'Invalid UUID' }),
    isDefault: z
      .boolean({ required_error: 'Grade isDefault is required' })
      .optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    isDefault: z
      .boolean({ required_error: 'Grade isDefault is required' })
      .optional(),
  }),
});

export const GradingSystemValidation = {
  gradeCreateSchema,
  gradeUpdateSchema,
  createValidationSchema,
  updateValidationSchema,
};
