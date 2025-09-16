import { CourseGrade } from '@prisma/client';

export type IAssignmentSubmissionFilterRequest = {
  searchTerm?: string | undefined;
};

export type IAssignmentSubmission = {
  assignmentId: string;
  authorId: string;
  userId: string;
  fileUrl: string;
  grade?: CourseGrade;
  marksObtained?: number;
  totalMarks?: number;
  feedback?: string;
  isReSubmission?: boolean;
};
