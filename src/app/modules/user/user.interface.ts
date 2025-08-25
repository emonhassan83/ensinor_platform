import { UserStatus } from "@prisma/client";

export type IUserFilterRequest = {
    searchTerm?: string | undefined;
    email?: string | undefined;
    status?: UserStatus | undefined;
};

export type IUser = {
    id: string;
    email: string;
    role: string;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
}
