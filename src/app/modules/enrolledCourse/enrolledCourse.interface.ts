import { CourseGrade, PlatformType } from "@prisma/client";

export type IEnrolledCourseFilterRequest = {
  searchTerm?: string | undefined;
  grade?: string | undefined;
  completedRate?: string | undefined;
};

export type IEnrolledCourse = {
  userId: string;
  authorId: string;
  courseId: string;
  platform: PlatformType;
  courseCategory: string;
  completedRate?: number;
  courseMark?: number;
  grade?: CourseGrade;
  learningTime?: number;
  isCompleted?: boolean;
};
