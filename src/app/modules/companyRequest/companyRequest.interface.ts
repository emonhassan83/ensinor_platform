export type ICompanyRequestFilterRequest = {
  searchTerm?: string | undefined;
  name?: string | undefined;
  organizationEmail?: string | undefined;
  companyType?: string | undefined;
  role?: string | undefined;
  status?: string | undefined;
};

export type ICompanyRequest = {
  userId: string;
  name: string;
  platformType: string;
  organizationEmail: string;
  companyType: string;
  phoneNumber: string;
  role: string;
  companySize: number;
  numberOfPeopleToTrain: number;
  trainingNeeds: number;
  description: string;
};
