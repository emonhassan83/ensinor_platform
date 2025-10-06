import { PlatformType } from "@prisma/client";

export type IShopFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  category?: string | undefined;
  status?: string | undefined;
};

export type IShop = {
  authorId: string;
  companyId?: string;
  platform: PlatformType
  title: string;
  description: string;
  writer: string;
  category: string;
  price: number;
  thumbnail: string;
  file: string;
  publishedDate: string;
  language: string
};
