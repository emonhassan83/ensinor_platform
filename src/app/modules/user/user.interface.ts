import { UserRole, UserStatus } from '@prisma/client';

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
  fcmToken?: string | null;
  photoUrl?: string | null;
  bio?: string | null;
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

// Interface for User, aligned with Prisma User model
export type IRegisterUser = {
  user: {
    name: string;
    email: string;
  };
  password: string;
  confirmPassword: string;
  photoUrl?: string;
};

// Interface for User response, excluding password for API responses
export type IUserResponse = Omit<IUser, 'password'>;

export type ICompanyAdmin = {
  name: string;
  organizationEmail: string;
  companyType: string;
  phoneNumber: string;
  role: string;
  companySize: number;
  numberOfPeopleToTrain: number;
  trainingNeeds: number;
  description: string;
};

export type IBusinessInstructor = {
  user: {
    name: string;
    email: string;
    bio: string;
  };
  businessInstructor: {
    authorId: string;
    companyId: string;
    designation: string;
  };
};

export type IEmployee = {
  user: {
    name: string;
    email: string;
    contactNo: string;
    bio?: string;
    dateOfBirth?: string;
    city?: string;
    country?: string;
    photoUrl?: string;
  };
  employee: {
    authorId: string;
    companyId: string;
    departmentId: string;
  };
};

export type IInstructor = {
  user: {
    name: string;
    email: string;
    contactNo: string;
    bio?: string;
  };
  instructor: {
    designation: string;
    university?: string;
    experience?: number;
  };
};

export type IStudent = {
  password: string;
  user: {
    name: string;
    email: string;
    contactNo: string;
    bio?: string;
    dateOfBirth?: string;
    city?: string;
    country?: string;
    photoUrl?: string;
  };
  student: {
    interests: string[];
    university?: string;
    session?: string;
    subjects: string;
  };
};
