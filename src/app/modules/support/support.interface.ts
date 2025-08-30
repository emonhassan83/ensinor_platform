export type ISupportFilterRequest = {
    searchTerm?: string | undefined;
    email?: string | undefined;
};

// Interface for User, aligned with Prisma User model
export type ISupport = {
  name: string;
  email: string
  message: string
};