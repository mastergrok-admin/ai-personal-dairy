import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

// Mock useAuth to avoid API calls during routing tests
vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    roles: [],
    permissions: [],
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshAuth: vi.fn(),
    hasPermission: () => false,
    hasAnyPermission: () => false,
  }),
}));

function renderApp(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("should render the home page at /", () => {
    renderApp("/");
    expect(screen.getByText("Your intelligent personal diary companion.")).toBeDefined();
  });

  it("should render 404 page for unknown routes", () => {
    renderApp("/some/random/route");
    expect(screen.getByText("404")).toBeDefined();
  });

  it("should render login page at /login", () => {
    renderApp("/login");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
  });

  it("should render register page at /register", () => {
    renderApp("/register");
    expect(screen.getByRole("heading", { name: "Create account" })).toBeDefined();
  });

  it("should redirect /dashboard to /login when not authenticated", () => {
    renderApp("/dashboard");
    // ProtectedRoute redirects to /login
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
  });

  it("should redirect /admin/users to /login when not authenticated", () => {
    renderApp("/admin/users");
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeDefined();
  });
});
