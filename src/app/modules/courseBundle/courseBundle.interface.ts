import { CourseLevel, PlatformType } from "@prisma/client";

export type ICourseBundleFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  category?: string | undefined;
};

export type ICourseBundle = {
  authorId: string;
  companyId?: string;
  platform: PlatformType
  title: string;
  description: string;
  courseIds: string[];
  category: string;
  level: CourseLevel;
  language: string;
  price: number;
  thumbnail: string;
  discount?: number
  duration?: number
  lectures?: number
  isFreeCourse?: boolean
};
