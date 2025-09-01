import { CourseLevel } from "@prisma/client";

export type IEventFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
  location?: string | undefined;
};

export type IEvent = {
  authorId: string;
  title: string;
  slogan: string;
  type: string;
  thumbnail: string;
  organizedBy: string;
  price: number;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  speakerSlogan: string;
  scheduleSlogan: string;
};
