import { CourseGrade } from "@prisma/client";

export type IEnrolledCourseFilterRequest = {
  searchTerm?: string | undefined;
  grade?: string | undefined;
  completedRate?: string | undefined;
};

export type IEnrolledCourse = {
  authorId: string;
  courseId: string;
  completedRate?: number;
  courseMark?: number;
  grade?: CourseGrade;
  learningTime?: number;
  isCompleted?: boolean;
};
