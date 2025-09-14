import { CourseLevel, CoursesStatus, CourseType } from '@prisma/client';

export type ICourseFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  type?: string | undefined;
  category?: string | undefined;
  level?: string | undefined;
  language?: string | undefined;
  status?: string | undefined;
};

export type ICourse = {
  authorId: string;
  instructorId: string;
  title: string;
  shortDescription: string;
  type?: CourseType;
  category: string;
  level: CourseLevel;
  language: string;
  points: number;
  deadline: string;
  price: number;
  description: string;
  thumbnail: string;
  hasCertificate: boolean;
  isFreeCourse: boolean;
  status?: CoursesStatus;
};
