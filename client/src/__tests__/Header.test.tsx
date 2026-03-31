import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "@/components/layout/Header";

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("Header", () => {
  it("should show Sign in and Sign up when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      hasPermission: () => false,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in")).toBeDefined();
    expect(screen.getByText("Sign up")).toBeDefined();
  });

  it("should show user name and logout when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: "John Doe", email: "john@test.com" },
      hasPermission: () => false,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByText("John Doe")).toBeDefined();
    expect(screen.getByText("Logout")).toBeDefined();
    expect(screen.getByText("Dashboard")).toBeDefined();
  });

  it("should show admin link when user has user.read permission", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: "Admin" },
      hasPermission: (perm: string) => ["user.read", "role.read", "permission.read"].includes(perm),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Admin" })).toBeDefined();
  });

  it("should not show admin link for regular user", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      user: { name: "Regular User" },
      hasPermission: () => false,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Admin")).toBeNull();
  });

  it("should always show app title", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
      hasPermission: () => false,
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    );

    expect(screen.getByText("AI Personal Diary")).toBeDefined();
  });
});
