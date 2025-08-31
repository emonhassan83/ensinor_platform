export type IQuestionFilterRequest = {
  searchTerm?: string | undefined;
  name?: string | undefined;
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
  options: IQuestionOption[];
};

