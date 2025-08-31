import { CourseLevel } from "@prisma/client";

export type ICourseFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  category?: string | undefined;
  level?: string | undefined;
  language?: string | undefined;
  status?: string | undefined;
};

export type ICourse = {
  authorId: string;
  title: string;
  shortDescription: string;
  category: string;
  level: CourseLevel;
  language: string;
  points: number;
  deadline: string;
  price: number;
  description: string;
  thumbnail: string;
  hasCertificate: boolean;
};
