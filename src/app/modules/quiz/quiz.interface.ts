import { QuizType } from "@prisma/client";

export type IQuizFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
  title?: string | undefined;
};

export type IQuiz = {
  authorId: string;
  courseId: string;
  title: string;
  type: QuizType;
  lesson?: number;
  passingScore: number;
  attemptAllow: number;
  timeLimit?: number;
};
