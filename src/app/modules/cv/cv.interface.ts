export type ICVFilterRequest = {
  searchTerm?: string | undefined;
  email?: string | undefined;
  designation?: string | undefined;
};

export type ICV = {
  userId: string;
  name: string;
  designation: string;
  photo: string;
  phone: string;
  email: string;
  linkedin: string;
  website: string;
  location: string;
  aboutMe: string;
  skills: string[];
};
