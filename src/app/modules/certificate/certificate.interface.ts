import { PlatformType } from '@prisma/client';

export type ICertificateFilterRequest = {
  searchTerm?: string | undefined;
  company?: string | undefined;
  student?: string | undefined;
  courseName?: string | undefined;
  instructor?: string | undefined;
};

export type ICertificate = {
  userId: string;
  enrolledCourseId: string;
  authorId: string;
  courseId: string;
  platform: PlatformType;
  company?: string;
  logo?: string;
  logoHeight?: number;
  logoWidth?: number;
  mainLogoHeight?: number;
  mainLogoWidth?: number;
  student: string;
  courseName: string;
  instructor: string;
  studyHour: number;
  topics: string[];
  completeDate: string;
  reference: string;
  signature: string;
};
