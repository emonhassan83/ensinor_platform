import { CartModelType } from "@prisma/client";

export type ICartFilterRequest = {
    searchTerm?: string | undefined;
    modelType?: string | undefined;
};

export type ICart = {
  userId: string;
  modelType: CartModelType;
  courseId?: string;
  bookId?: string;
};