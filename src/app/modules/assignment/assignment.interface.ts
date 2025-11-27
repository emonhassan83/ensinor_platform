import { AssignmentType } from "@prisma/client";

export type IAssignmentFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
};

export type IAssignment = {
  authorId: string;
  courseId: string;
  title: string;
  type: AssignmentType;
  lesson: number;
  description: string;
  fileUrl?: string;
  marks: number;
  deadline?: Date;
};
