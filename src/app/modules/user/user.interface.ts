import { UserRole, UserStatus } from "@prisma/client";

export type IUserFilterRequest = {
    searchTerm?: string | undefined;
    email?: string | undefined;
    status?: UserStatus | undefined;
};

// Interface for User, aligned with Prisma User model
export type IUser = {
  id: string;
  name: string;
  email: string;
  password: string;
  photoUrl?: string | null;
  bio?:  string | null;
  dateOfBirth?: string | null;
  contactNo?: string | null;
  city?: string | null;
  country?: string | null;
  role: UserRole;
  lastActive?: Date;
  status: UserStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Interface for User response, excluding password for API responses
export type IUserResponse = Omit<IUser, 'password'>;