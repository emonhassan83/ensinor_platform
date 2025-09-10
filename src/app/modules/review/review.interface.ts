export type IReviewFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IReview = {
  authorId: string;
  courseId: string;
  rating: number;
  comment: string;
};
