export type ICompanyAdminFilterRequest = {
  searchTerm?: string | undefined;
  status?: string | undefined;
};

export type IBranding = {
  name: string;
  logo: string;
  color: string;
}