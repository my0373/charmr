import { api } from "./client";
import type {
  Family,
  Guardianship,
  Permission,
  Person,
  Profile,
  Region,
  Role,
  RoleAssignment,
  User,
} from "./types";

export type { Family, Guardianship, Permission, Person, Profile, Region, Role, RoleAssignment, User };
export { ApiError } from "./client";

export const regions = {
  list: () => api.get<Region[]>("/api/regions/"),
  get: (id: number) => api.get<Region>(`/api/regions/${id}/`),
  create: (data: Partial<Region>) => api.post<Region>("/api/regions/", data),
  update: (id: number, data: Partial<Region>) => api.put<Region>(`/api/regions/${id}/`, data),
  delete: (id: number) => api.delete(`/api/regions/${id}/`),
};

export const families = {
  list: () => api.get<Family[]>("/api/families/"),
  get: (id: number) => api.get<Family>(`/api/families/${id}/`),
  create: (data: Partial<Family>) => api.post<Family>("/api/families/", data),
  update: (id: number, data: Partial<Family>) => api.put<Family>(`/api/families/${id}/`, data),
  delete: (id: number) => api.delete(`/api/families/${id}/`),
};

export const people = {
  list: () => api.get<Person[]>("/api/people/"),
  get: (id: number) => api.get<Person>(`/api/people/${id}/`),
  create: (data: Partial<Person>) => api.post<Person>("/api/people/", data),
  update: (id: number, data: Partial<Person>) => api.put<Person>(`/api/people/${id}/`, data),
  delete: (id: number) => api.delete(`/api/people/${id}/`),
};

export const roles = {
  list: () => api.get<Role[]>("/api/roles/"),
  get: (id: number) => api.get<Role>(`/api/roles/${id}/`),
  create: (data: { name: string; description?: string; permission_ids?: number[] }) =>
    api.post<Role>("/api/roles/", data),
  update: (id: number, data: { name?: string; description?: string; permission_ids?: number[] }) =>
    api.put<Role>(`/api/roles/${id}/`, data),
  delete: (id: number) => api.delete(`/api/roles/${id}/`),
};

export const permissions = {
  list: () => api.get<Permission[]>("/api/permissions/"),
};

export const roleAssignments = {
  list: () => api.get<RoleAssignment[]>("/api/role-assignments/"),
  create: (data: Partial<RoleAssignment>) => api.post<RoleAssignment>("/api/role-assignments/", data),
  delete: (id: number) => api.delete(`/api/role-assignments/${id}/`),
};

export const guardianships = {
  list: () => api.get<Guardianship[]>("/api/guardianships/"),
  get: (id: number) => api.get<Guardianship>(`/api/guardianships/${id}/`),
  create: (data: Partial<Guardianship>) => api.post<Guardianship>("/api/guardianships/", data),
  update: (id: number, data: Partial<Guardianship>) =>
    api.put<Guardianship>(`/api/guardianships/${id}/`, data),
  delete: (id: number) => api.delete(`/api/guardianships/${id}/`),
};

export const users = {
  list: () => api.get<User[]>("/api/users/"),
  get: (id: number) => api.get<User>(`/api/users/${id}/`),
  create: (data: { username: string; email: string; password: string; first_name?: string; last_name?: string }) =>
    api.post<User>("/api/users/", data),
  update: (id: number, data: Partial<User>) => api.put<User>(`/api/users/${id}/`, data),
};

export const profile = {
  get: () => api.get<Profile>("/api/profile/"),
  update: (data: { first_name?: string; last_name?: string; email?: string; phone?: string }) =>
    api.put<Profile>("/api/profile/", data),
};

export const dataManagement = {
  exportUrl: "/api/data/export/",
  import: (file: File, wipe: boolean = false) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("wipe", wipe ? "true" : "false");
    return api.postForm<{ detail: string; log: string }>("/api/data/import/", fd);
  },
};
