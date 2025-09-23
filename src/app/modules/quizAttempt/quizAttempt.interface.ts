import { CourseGrade } from "@prisma/client";

export type IQuizAttemptFilterRequest = {
  searchTerm?: string | undefined;
  grade?: string | undefined;
  correctRate?: string | undefined;
};

export type IQuizAttempt = {
  quizId: string;
  userId: string;
  authorId: string;
  timeTaken?: number;
  marksObtained?: number;
  totalMarks?: number;
  grade?: CourseGrade;
  correctRate?: number;
  lastAttempt: Date;
  isCompleted?: boolean;
};
