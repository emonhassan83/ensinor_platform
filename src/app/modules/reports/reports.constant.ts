export const studentSearchableFields: string[] = ['name', 'email'];
export const courseSearchableFields: string[] = ['title'];
export const businessSearchableFields: string[] = ['name'];
export const eventSearchableFields: string[] = ['title'];

export const studentFilterableFields: string[] = ['searchTerm', 'email'];
export const courseFilterableFields: string[] = ['searchTerm', 'title'];
export const businessFilterableFields: string[] = ['searchTerm', 'name'];
export const eventFilterableFields: string[] = ['searchTerm', 'title'];

export type IStudentFilterRequest = {
  searchTerm?: string | undefined;
  email?: string | undefined;
};
export type ICourseFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
};
export type IBusinessFilterRequest = {
  searchTerm?: string | undefined;
  name?: string | undefined;
};
export type IEventFilterRequest = {
  searchTerm?: string | undefined;
  title?: string | undefined;
};
