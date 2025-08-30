export type IDepartmentFilterRequest = {
    searchTerm?: string | undefined;
    name?: string | undefined;
};

// Interface for User, aligned with Prisma User model
export type IDepartment = {
  name: string;
  image: string;
  authorId: string;
};