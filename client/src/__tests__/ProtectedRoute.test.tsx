import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/features/auth/ProtectedRoute";

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderProtectedRoute(permission?: string) {
  return render(
    <MemoryRouter>
      <ProtectedRoute permission={permission}>
        <div>Protected Content</div>
      </ProtectedRoute>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("should show loading spinner when auth is loading", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      hasPermission: () => false,
    });

    const { container } = renderProtectedRoute();
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("should redirect to login when not authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      hasPermission: () => false,
    });

    renderProtectedRoute();
    // Content should not be visible (redirected)
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("should render children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => true,
    });

    renderProtectedRoute();
    expect(screen.getByText("Protected Content")).toBeDefined();
  });

  it("should redirect when missing required permission", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasPermission: () => false,
    });

    renderProtectedRoute("admin.dashboard");
    expect(screen.queryByText("Protected Content")).toBeNull();
  });

  it("should render when user has required permission", () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      hasPermission: (perm: string) => perm === "user.read",
    });

    renderProtectedRoute("user.read");
    expect(screen.getByText("Protected Content")).toBeDefined();
  });
});
