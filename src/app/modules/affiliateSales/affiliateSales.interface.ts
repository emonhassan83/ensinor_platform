export type IAffiliateSaleFilterRequest = {
  searchTerm?: string | undefined;
};

export type IAffiliateSale = {
  affiliateId: string;
  courseId: string;
  orderId: string;
  commission: number;
};