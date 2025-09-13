import { Permission } from "@prisma/client";

export type ICoInstructorFilterRequest = {
  searchTerm?: string | undefined;
  permissions?: string | undefined;
};

// Interface for Co instructors, aligned with Prisma User model
export type ICoInstructors = {
  courseId: string;
  coInstructorId: string;
  invitedById: string;
  permissions: Permission[];
};