export type IInvitationFilterRequest = {
  searchTerm?: string | undefined;
  name?: string | undefined;
  groupName?: string | undefined;
  email?: string | undefined;
};

export type IInvitation = {
  userId: string;
  departmentId: string;
  name: string;
  groupName?: string;
  email: string;
};

export type IGroupInvitation = {
  userId: string;
  departmentId: string;
  name?: string;
  groupName: string;
  email: string[];
};