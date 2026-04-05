import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CommandPalette } from "@/components/ui/command-palette";

vi.mock("@/hooks/useAuth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    logout: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    refreshAuth: vi.fn(),
    hasPermission: () => false,
    hasAnyPermission: () => false,
  }),
}));

vi.mock("@/hooks/useTheme", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({
    theme: "dark",
    toggleTheme: vi.fn(),
  }),
}));

function wrap(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>
  );
}

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    wrap(<CommandPalette open={false} onClose={() => {}} />);
    expect(screen.queryByPlaceholderText("Search pages, actions…")).toBeNull();
  });

  it("renders input when open", () => {
    wrap(<CommandPalette open={true} onClose={() => {}} />);
    expect(screen.getByPlaceholderText("Search pages, actions…")).toBeDefined();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const onClose = vi.fn();
    const { container } = wrap(
      <CommandPalette open={true} onClose={onClose} />
    );
    const backdrop = container.firstChild as HTMLElement;
    backdrop.click();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows navigation items", () => {
    wrap(<CommandPalette open={true} onClose={() => {}} />);
    expect(screen.getByText("Go to Overview")).toBeDefined();
    expect(screen.getByText("Go to Bank Accounts")).toBeDefined();
  });
});
