import { CompanyType } from "@prisma/client";

export type ICompanyRequestFilterRequest = {
  searchTerm?: string | undefined;
  name?: string | undefined;
  organizationEmail?: string | undefined;
  companyType?: string | undefined;
  role?: string | undefined;
  status?: string | undefined;
};

export type ICompanyRequest = {
  name: string;
  organizationEmail: string;
  platformType: CompanyType;
  phoneNumber: string;
  companySize: string;
  numberOfPeopleToTrain: string;
  description: string;
};
