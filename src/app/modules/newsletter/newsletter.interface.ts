import { RecurrenceType } from "@prisma/client";

export type INewsletterFilterRequest = {
    searchTerm?: string | undefined;
    email?: string | undefined;
    recurrence?: string | undefined;
};

// Interface for User, aligned with Prisma User model
export type INewsletter = {
  email: string
  recurrence: RecurrenceType;
};