import { ReviewModelType } from "@prisma/client";

export type IReviewFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IReview = {
  authorId: string;
  courseId: string;
  courseBundleId?: string;
  modelType: ReviewModelType;
  rating: number;
  comment: string;
};
