export type IQuizAttemptFilterRequest = {
  searchTerm?: string | undefined;
  grade?: string | undefined;
  correctRate?: string | undefined;
};

export type IQuizAttempt = {
  quizId: string;
  userId: string;
  authorId: string;
  timeTaken?: string;
  marksObtained?: number;
  totalMarks?: number;
  grade?: string;
  correctRate?: number;
  isCompleted?: boolean;
};
