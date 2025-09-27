export type IAffiliateSaleFilterRequest = {
  searchTerm?: string | undefined;
};

export type IAffiliateSale = {
  affiliateId: string;
  authorId: string;
  orderId: string;
  commission: number;
};