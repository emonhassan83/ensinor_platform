import { ResourceModelType } from "@prisma/client";

export type IResourceFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IResource = {
  name: string;
  modelType: ResourceModelType;
  reference: string;
  file: string;
};
