export type IReviewRefFilterRequest = {
  searchTerm?: string | undefined;
  comment?: string | undefined;
};

export type IReviewRef = {
  userId: string;
  reviewId: string;
  comment: string;
};
