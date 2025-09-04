import { AssignmentModelType } from "@prisma/client";

export type IMeetingAssignFilterRequest = {
  searchTerm?: string | undefined;
  modelType?: string | undefined;
};

export type IMeetingAssign = {
  authorId: string;
  modelType: AssignmentModelType;
  courseId?: string;
  eventId?: string;
  userId?: string;
  zoomMeetingId: string;
};
