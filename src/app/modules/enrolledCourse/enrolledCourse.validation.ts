import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'Author id is required' })
      .uuid('author id must be a valid UUID'),
    courseId: z
      .string({ required_error: 'Course id is required' })
      .uuid('course id must be a valid UUID'),
  }),
});

// Group enrolled validation
const groupEnrolledValidationSchema = z.object({
  body: z.object({
    userIds: z.array(
      z
        .string({ required_error: 'Author id is required' })
        .uuid('author id must be a valid UUID'),
    ),
    courseId: z
      .string({ required_error: 'Course id is required' })
      .uuid('course id must be a valid UUID'),
  }),
});

// Group enrolled validation
const departmentEnrolledValidationSchema = z.object({
  body: z.object({
    departmentId: z
      .string({ required_error: 'Department id is required' })
      .uuid('department id must be a valid UUID'),
    courseId: z
      .string({ required_error: 'Course id is required' })
      .uuid('course id must be a valid UUID'),
  }),
});

const bulkEnrolledValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'Author id is required' })
      .uuid('author id must be a valid UUID'),
    courseIds: z.array(
      z
        .string({ required_error: 'Course id is required' })
        .uuid('course id must be a valid UUID'),
    ),
  }),
});

const bundleEnrollValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'Author id is required' })
      .uuid('author id must be a valid UUID'),
    bundleId: z
      .string({ required_error: 'Course bundle id is required' })
      .uuid('course id must be a valid UUID'),
  }),
});

const bulkBundleEnrollValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'Author id is required' })
      .uuid('author id must be a valid UUID'),
    bundleIds: z.array(
      z
        .string({ required_error: 'Course bundle id is required' })
        .uuid('course id must be a valid UUID'),
    ),
  }),
});

// Create validation
const watchLectureValidationSchema = z.object({
  body: z.object({
    enrolledCourseId: z
      .string({ required_error: 'Enrolled CourseId is required' })
      .uuid('Enrolled Course id must be a valid UUID'),
    lectureId: z
      .string({ required_error: 'lecture id is required' })
      .uuid('lecture id must be a valid UUID'),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    completedRate: z
      .number({ required_error: 'Enrolled course completedRate is required!' })
      .optional(),
    courseMark: z
      .number({ required_error: 'Enrolled course courseMark is required!' })
      .optional(),
    grade: z
      .string({ required_error: 'Enrolled course grade is required!' })
      .optional(),
    learningTime: z
      .number({ required_error: 'Enrolled course learningTime is required!' })
      .optional(),
    isCompleted: z
      .boolean({ required_error: 'Enrolled course isCompleted is required!' })
      .optional(),
  }),
});

export const EnrolledCourseValidation = {
  createValidationSchema,
  groupEnrolledValidationSchema,
  departmentEnrolledValidationSchema,
  bulkEnrolledValidationSchema,
  bundleEnrollValidationSchema,
  bulkBundleEnrollValidationSchema,
  watchLectureValidationSchema,
  updateValidationSchema,
};
