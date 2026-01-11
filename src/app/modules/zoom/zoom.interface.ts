export type IZoomFilterRequest = {
  searchTerm?: string | undefined;
  status?: string | undefined;
};

export type IZoomAccount = {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  zoomUserId: string;
  email: string;
};

export type IZoomMeeting = {
  userId: string;
  zoomAccountId: string;
  zoomMeetingId: string;
  topic: string;
  agenda: string;
  startUrl: string;
  joinUrl: string;
  password: string;
  duration: number;
  startTime: string;
  endTime: string;
  timezone?: string;
};