export type IEventScheduleFilterRequest = {
  searchTerm?: string | undefined;
  date?: string | undefined;
};

export type IEventSchedule = {
  eventId: string;
  day: string;
  date: string;
};
