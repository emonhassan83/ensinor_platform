import { PackageAudience, PackageBillingCycle, SubscriptionType } from "@prisma/client";

export type IPackageFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
  audience?: string | undefined;
  billingCycle?: string | undefined;
};

export type IPackage = {
  title: string;
  type: SubscriptionType;
  audience: PackageAudience
  features: string[];
  billingCycle: PackageBillingCycle;
  price: number;
};
