import { ReviewModelType } from "@prisma/client";

export type IReviewFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IReview = {
  authorId: string;
  modelType: ReviewModelType;
  courseId?: string;
  userId?: string;
  rating: number;
  comment: string;
};
