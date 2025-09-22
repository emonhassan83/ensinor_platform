import { CourseLevel, CoursesStatus, CourseType, PlatformType } from '@prisma/client';

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
  companyId: string;
  title: string;
  shortDescription: string;
  platform: PlatformType;
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
