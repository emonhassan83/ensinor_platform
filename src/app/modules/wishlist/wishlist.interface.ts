import { WishListModelType } from "@prisma/client";

export type IWishlistFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IWishlist = {
  userId: string;
  modelType: WishListModelType;
  courseId?: string;
  courseBundleId?: string;
  bookId?: string;
};
