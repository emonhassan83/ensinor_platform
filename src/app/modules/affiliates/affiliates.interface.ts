export type IAffiliatesFilterRequest = {
  searchTerm?: string | undefined;
};

export type IAffiliateAccount = {
  userId: string;
};

export type IAffiliates = {
  affiliateId: string;
  courseId: string;
  link: string;
};