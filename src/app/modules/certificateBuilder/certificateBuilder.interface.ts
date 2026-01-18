export type ICertificateBuilderFilter = {
  searchTerm?: string | undefined;
};

export type ICertificateBuilder = {
  authorId: string;
  company?: string;
  logo?: string;
  logoHeight?: number;
  logoWidth?: number;
  isVisibleTopics: boolean
};
