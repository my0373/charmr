export interface Region {
  id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface Family {
  id: number;
  name: string;
  status: "active" | "lapsed" | "pending";
  created_at: string;
  updated_at: string;
  member_count: number;
}

export interface Person {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  date_of_birth: string | null;
  email: string;
  phone: string;
  family: number;
  family_name: string;
  user: number | null;
  username: string | null;
  is_minor: boolean;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  codename: string;
  name: string;
  category: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  is_system_role: boolean;
  permissions: Permission[];
  assignment_count: number;
  created_at: string;
}

export interface RoleAssignment {
  id: number;
  user: number | null;
  group: number | null;
  role: number;
  role_name: string;
  scope_type: "global" | "region" | "family";
  scope_id: number | null;
  scope_display: string;
  user_display: string | null;
  group_display: string | null;
  assigned_at: string;
  assigned_by: number | null;
}

export interface Guardianship {
  id: number;
  guardian: number;
  guardian_name: string;
  ward: number;
  ward_name: string;
  ward_is_minor: boolean;
  status: "active" | "pending" | "revoked";
  created_at: string;
  approved_by: number | null;
  approved_by_username: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  date_joined: string;
  last_login: string | null;
  person: Person | null;
  role_assignments: RoleAssignment[];
}

export interface Profile {
  user: User;
  person: Person | null;
  permissions: string[];
}
