export type IBatchFilterRequest = {
  searchTerm?: string | undefined;
  category?: string | undefined;
  rarity?: string | undefined;
};

export type IBatch = {
  authorId: string;
  title: string;
  description: string;
  logo: string;
  category: string;
  rarity: string;
};
