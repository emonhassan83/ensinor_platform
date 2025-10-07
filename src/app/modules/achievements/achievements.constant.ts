export const studentSearchableFields: string[] = ['name', 'email'];
export const courseSearchableFields: string[] = ['title'];

export const studentFilterableFields: string[] = ['searchTerm', 'email'];
export const courseFilterableFields: string[] = ['searchTerm', 'title'];

export type IStudentFilterRequest = {
  searchTerm?: string | undefined;
  email?: string | undefined;
};
export type ICourseFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
};