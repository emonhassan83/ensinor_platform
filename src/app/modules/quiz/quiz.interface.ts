export type IQuizFilterRequest = {
  searchTerm?: string | undefined;
  deadline?: string | undefined;
  questions?: string | undefined;
  totalAttempt?: string | undefined;
};

export type IQuiz = {
  courseId: string;
  deadline?: string;
  time?: string;
};
