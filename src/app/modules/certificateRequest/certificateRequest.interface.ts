import { CertificateRequestStatus } from "@prisma/client";

export type ICertificateRequestFilterRequest = {
  searchTerm?: string | undefined;
  status?: string | undefined;
};

export type ICertificateRequest = {
  authorId: string;
  courseId: string;
  status?: CertificateRequestStatus;
  isCompleted?: boolean;
};
