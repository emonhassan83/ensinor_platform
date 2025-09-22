import { PlatformType } from "@prisma/client";

export type ICourseBundleFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  category?: string | undefined;
};

export type ICourseBundle = {
  authorId: string;
  companyId?: string;
  platform: PlatformType
  title: string;
  course: string[];
  category: string;
  price: number;
  thumbnail: string;
  discount?: number
};
