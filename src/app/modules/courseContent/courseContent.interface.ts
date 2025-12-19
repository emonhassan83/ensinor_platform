import { ContentType } from "@prisma/client";

export type ICourseContentFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
};

export type ICourseLesson = {
  sectionId: string;
  serial: number;
  title: string;
  description?: string;
  type: ContentType;
  media: string;
  duration?: number;
  fileStorage?: number;
};

export type ICourseSection = {
  courseId: string;
  title: string;
  description: string;
  lesson: ICourseLesson[];
};
