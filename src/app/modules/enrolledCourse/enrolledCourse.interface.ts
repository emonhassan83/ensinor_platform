import { CourseGrade, EnrollmentType } from "@prisma/client";

export type IEnrolledCourseFilterRequest = {
  searchTerm?: string | undefined;
  grade?: string | undefined;
  completedRate?: string | undefined;
};

export type IEnrolledCourse = {
  authorId: string;
  courseId: string;
  type: EnrollmentType;
  courseCategory: string;
  completedRate?: number;
  courseMark?: number;
  grade?: CourseGrade;
  learningTime?: number;
  isCompleted?: boolean;
};
