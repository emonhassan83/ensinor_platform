export type IAssignmentFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
};

export type IAssignment = {
  authorId: string;
  courseId: string;
  title: string;
  description: string;
  fileUrl?: string;
  marks: number;
  deadline?: Date;
};
