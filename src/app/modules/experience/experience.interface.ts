export type IExperienceFilterRequest = {
  searchTerm?: string | undefined;
  designation?: string | undefined;
  jobType?: string | undefined;
};

export type IExperience = {
  cvId: string;
  companyName: string;
  designation: string;
  jobType: string;
  startTime: string;
  endTime: string;
  description: string;
  skills: string[];
};
