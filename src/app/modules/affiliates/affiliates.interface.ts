import { AffiliateModel } from '@prisma/client';

export type IAffiliatesFilterRequest = {
  searchTerm?: string | undefined;
};

export type IAffiliateAccount = {
  userId: string;
};

export type IAffiliates = {
  affiliateId: string;
  modelType: AffiliateModel;
  bookId?: string;
  courseId?: string;
  eventId?: string;
};
