import { ResourceModelType } from "@prisma/client";

export type IResourceFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IResource = {
  name: string;
  authorId: string;
  modelType: ResourceModelType;
  courseId?: string;
  bookId?: string;
  eventId?: string;
  file: string;
};
