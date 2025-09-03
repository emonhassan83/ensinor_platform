export type IMessageFilterRequest = {
  searchTerm?: string | undefined;
  text?: string | undefined;
};

export type IMessage = {
  senderId: string;
  chatId: string;
  receiverId?: string | undefined;
  text?: string;
  imageUrl?: string[];
};
