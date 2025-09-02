export type ICVCertificateFilterRequest = {
  searchTerm?: string | undefined;
  instituteName?: string | undefined;
  degree?: string | undefined;
};

export type ICVCertificate = {
  cvId: string;
  instituteName: string;
  degree: string;
  credentialId: string;
  file: string;
};
