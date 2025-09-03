import { ChatType } from "@prisma/client";

export type IChatFilterRequest = {
  searchTerm?: string | undefined;
  type?: string | undefined;
};

export type IChatParticipant = {
  userId: string;
  chatId: string;
};

export type IChat = {
  type: ChatType;
  groupName?: string;
  groupImage?: string;
};
