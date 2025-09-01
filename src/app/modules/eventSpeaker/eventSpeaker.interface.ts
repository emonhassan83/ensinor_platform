export type IEventSpeakerFilterRequest = {
  searchTerm?: string | undefined;
  profession?: string | undefined;
};

export type IEventSpeaker = {
  eventId: string;
  eventScheduleId: string;
  name: string;
  photo: string;
  profession: string;
};
