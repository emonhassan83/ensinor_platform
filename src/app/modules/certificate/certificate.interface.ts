import { CertificateRequestStatus } from "@prisma/client";

export type ICertificateFilterRequest = {
  searchTerm?: string | undefined;
  company?: string | undefined;
  student?: string | undefined;
  courseName?: string | undefined;
  instructor?: string | undefined;
};

export type ICertificate = {
  authorId: string;
  courseId: string;
  company: string;
  logo: string;
  student: string;
  courseName: string;
  instructor: string;
  studyHour: number;
  topics: string[];
  completeDate: string;
  reference: string;
  signature: string;
};
