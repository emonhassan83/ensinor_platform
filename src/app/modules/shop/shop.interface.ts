export type IShopFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  category?: string | undefined;
  status?: string | undefined;
};

export type IShop = {
  authorId: string;
  title: string;
  description: string;
  writer: string;
  category: string;
  price: number;
  thumbnail: string;
  file: string;
  publishedDate: string;
};
