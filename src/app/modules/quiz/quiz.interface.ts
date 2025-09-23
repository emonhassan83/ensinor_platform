export type IQuizFilterRequest = {
  searchTerm?: string | undefined;
  deadline?: string | undefined;
  questions?: string | undefined;
  totalAttempt?: string | undefined;
};

export type IQuiz = {
  authorId: string;
  courseId: string;
  deadline?: string;
  time?: number;
};
