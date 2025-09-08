import { PackageAudience, PackageBillingCycle } from "@prisma/client";

export type IPackageFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  audience?: string | undefined;
  billingCycle?: string | undefined;
};

export type IPackage = {
  title: string;
  type: string;
  logo: string;
  audience: PackageAudience
  features: string[];
  billingCycle: PackageBillingCycle;
  price: number;
};
