import { ReviewModelType } from "@prisma/client";

export type IReviewFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IReview = {
  userId: string;
  modelType: ReviewModelType;
  referenceId: string;
  rating: number;
  comment: string;
};
