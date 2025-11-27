import { QuestionType } from "@prisma/client";

export type IQuestionFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
};

export type IQuestionOption = {
  questionId?: string;
  optionLevel: string;
  optionText: string;
  isCorrect: boolean;
};

export type IQuestion = {
  quizId: string;
  name: string;
  type: QuestionType;
  point: number;
  expectedAnswer: string[];
  feedback: string;
  options: IQuestionOption[];
};

