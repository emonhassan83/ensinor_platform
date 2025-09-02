export type IEducationFilterRequest = {
  searchTerm?: string | undefined;
  degree?: string | undefined;
  type?: string | undefined;
};

export type IEducation = {
  cvId: string;
  institution: string;
  degree: string;
  location: string;
  result: string;
  startTime: string;
  endTime: string;
  type: string;
};
