import { describe, it, expect } from "vitest";
import type {
  ApiResponse,
  PaginatedResponse,
  AuthUser,
  AuthRole,
  AuthPermission,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../index.js";

describe("Shared Types", () => {
  it("should create a valid ApiResponse", () => {
    const response: ApiResponse<string> = {
      success: true,
      data: "hello",
    };
    expect(response.success).toBe(true);
    expect(response.data).toBe("hello");
  });

  it("should create an error ApiResponse", () => {
    const response: ApiResponse = {
      success: false,
      error: "Something went wrong",
    };
    expect(response.success).toBe(false);
    expect(response.error).toBe("Something went wrong");
  });

  it("should create a valid PaginatedResponse", () => {
    const response: PaginatedResponse<string> = {
      success: true,
      data: ["a", "b", "c"],
      total: 100,
      page: 1,
      limit: 20,
    };
    expect(response.total).toBe(100);
    expect(response.data?.length).toBe(3);
  });

  it("should create a valid AuthUser", () => {
    const user: AuthUser = {
      id: "abc123",
      email: "test@example.com",
      name: "Test User",
      avatar: null,
      provider: "local",
      isActive: true,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(user.provider).toBe("local");
    expect(user.isActive).toBe(true);
  });

  it("should create a valid AuthRole", () => {
    const role: AuthRole = {
      id: "role1",
      name: "Admin",
      description: "Full access",
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(role.name).toBe("Admin");
  });

  it("should create a valid AuthPermission", () => {
    const perm: AuthPermission = {
      id: "perm1",
      name: "user.read",
      description: "Read users",
      module: "user",
      createdAt: new Date().toISOString(),
    };
    expect(perm.module).toBe("user");
  });

  it("should create a valid AuthResponse", () => {
    const auth: AuthResponse = {
      user: {
        id: "u1",
        email: "test@test.com",
        name: "Test",
        avatar: null,
        provider: "google",
        isActive: true,
        emailVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      roles: [
        {
          id: "r1",
          name: "User",
          description: null,
          isDefault: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      permissions: ["diary.read", "diary.create"],
    };
    expect(auth.permissions.length).toBe(2);
    expect(auth.roles[0].name).toBe("User");
  });

  it("should validate LoginRequest shape", () => {
    const login: LoginRequest = {
      email: "test@test.com",
      password: "mypassword",
    };
    expect(login.email).toBeDefined();
    expect(login.password).toBeDefined();
  });

  it("should validate RegisterRequest shape", () => {
    const register: RegisterRequest = {
      name: "John",
      email: "john@test.com",
      password: "mypassword",
    };
    expect(register.name).toBeDefined();
    expect(register.email).toBeDefined();
    expect(register.password).toBeDefined();
  });
});
