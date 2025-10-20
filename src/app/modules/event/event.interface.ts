import { EventType, PlatformType } from '@prisma/client';

export type IEventFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
  location?: string | undefined;
  status?: string | undefined;
};

export type IEvent = {
  authorId: string;
  companyId?: string;
  platform: PlatformType;
  title: string;
  slogan: string;
  type: EventType;
  category: string;
  thumbnail: string;
  organizedBy: string;
  price: number;
  location: string;
  language: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  speakerSlogan: string;
  scheduleSlogan: string;
};
