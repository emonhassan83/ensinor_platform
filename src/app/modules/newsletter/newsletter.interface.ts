import { NewsletterCategory, RecurrenceType } from "@prisma/client";

export type INewsletterFilterRequest = {
    searchTerm?: string | undefined;
    email?: string | undefined;
    recurrence?: string | undefined;
};

// Interface for User, aligned with Prisma User model
export type ISubscriber = {
  email: string
  category: NewsletterCategory[]
  recurrence: RecurrenceType;
};

// Interface for User, aligned with Prisma User model
export type INewsletter = {
  title: string
  content: string;
  category: NewsletterCategory;
};