export type IBankDetailsFilterRequest = {
    searchTerm?: string | undefined;
    bankName?: string | undefined;
};

// Interface for User, aligned with Prisma User model
export type IBankDetails = {
  authorId: string;
  accountNumber: string;
  routingNumber: string;
  bankName: string;
  bankHolderName: string;
  bankAddress: string;
};