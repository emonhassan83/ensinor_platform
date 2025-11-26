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
  companyId?: string;
  title: string;
  description: string;
  shortDescription: string;
  platform: PlatformType;
  type?: CourseType;
  audience: string[];
  objectives: string[];
  prerequisites: string;
  category: string;
  topics: string[];
  level: CourseLevel;
  language: string;
  price: number;
  thumbnail: string;
  points: number;
  deadline: string;
  hasCertificate: boolean;
  isPublished: boolean;
  isFreeCourse: boolean;
  status?: CoursesStatus;
};
