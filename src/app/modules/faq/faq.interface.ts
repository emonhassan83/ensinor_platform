export type IFaqFilterRequest = {
    searchTerm?: string | undefined;
    question?: string | undefined;
};

// Interface for User, aligned with Prisma User model
export type IFaq = {
  question: string;
  answer: string
};