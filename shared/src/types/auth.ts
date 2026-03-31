export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  provider: "local" | "google" | "microsoft";
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthRole {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPermission {
  id: string;
  name: string;
  description: string | null;
  module: string;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthUser;
  roles: AuthRole[];
  permissions: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface UserWithRoles extends AuthUser {
  roles: AuthRole[];
}

export interface RoleWithPermissions extends AuthRole {
  permissions: AuthPermission[];
  _count?: { users: number };
}
