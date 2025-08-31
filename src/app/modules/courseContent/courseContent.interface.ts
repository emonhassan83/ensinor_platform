export type ICourseContentFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
};

export type ICourseContent = {
  courseId: string;
  title: string;
  video: string;
  duration: number;
};
