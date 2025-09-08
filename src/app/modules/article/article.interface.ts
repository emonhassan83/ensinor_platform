export type IArticleFilterRequest = {
    searchTerm?: string | undefined;
    category?: string | undefined;
};

// Interface for User, aligned with Prisma User model
export type IArticle = {
  authorId: string;
  title: string;
  category: string;
  thumbnail?: string;
  description: string;
};