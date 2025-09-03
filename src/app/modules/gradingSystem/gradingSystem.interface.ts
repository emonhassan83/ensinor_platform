import { CourseGrade } from "@prisma/client";

export type IGradingSystemFilterRequest = {
  searchTerm?: string | undefined;
};

export type IGrade = {
  gradingSystemId: string;
  minScore: number;
  maxScore: number;
  gradeLabel: CourseGrade;
};

export type IGradingSystem = {
  courseId?: string;
  authorId: string;
  isDefault?: boolean
};

