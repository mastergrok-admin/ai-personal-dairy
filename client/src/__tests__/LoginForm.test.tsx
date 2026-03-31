import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LoginForm } from "@/components/features/auth/LoginForm";

function renderLoginForm() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should render email and password fields", () => {
    renderLoginForm();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
  });

  it("should render sign in button", () => {
    renderLoginForm();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDefined();
  });

  it("should allow typing in email field", async () => {
    renderLoginForm();
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    await userEvent.type(emailInput, "test@example.com");
    expect(emailInput.value).toBe("test@example.com");
  });

  it("should allow typing in password field", async () => {
    renderLoginForm();
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    await userEvent.type(passwordInput, "mypassword");
    expect(passwordInput.value).toBe("mypassword");
  });

  it("should have required attributes on inputs", () => {
    renderLoginForm();
    expect(screen.getByLabelText("Email")).toHaveAttribute("required");
    expect(screen.getByLabelText("Password")).toHaveAttribute("required");
  });

  it("should have correct input types", () => {
    renderLoginForm();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });
});
