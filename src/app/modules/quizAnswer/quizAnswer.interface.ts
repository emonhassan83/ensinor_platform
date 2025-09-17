export type IQuizAnswerFilterRequest = {
  searchTerm?: string | undefined;
};

export type IQuizAnswer = {
  attemptId: string;
  questionId: string;
  optionId: string;
  isCorrect: boolean;
};
