import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { RegisterForm } from "@/components/features/auth/RegisterForm";

function renderRegisterForm() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterForm />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("RegisterForm", () => {
  it("should render all form fields", () => {
    renderRegisterForm();
    expect(screen.getByLabelText("Full Name")).toBeDefined();
    expect(screen.getByLabelText("Email")).toBeDefined();
    expect(screen.getByLabelText("Password")).toBeDefined();
    expect(screen.getByLabelText("Confirm Password")).toBeDefined();
  });

  it("should render create account button", () => {
    renderRegisterForm();
    expect(screen.getByRole("button", { name: "Create account" })).toBeDefined();
  });

  it("should allow filling in all fields", async () => {
    renderRegisterForm();

    const nameInput = screen.getByLabelText("Full Name") as HTMLInputElement;
    const emailInput = screen.getByLabelText("Email") as HTMLInputElement;
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    const confirmInput = screen.getByLabelText("Confirm Password") as HTMLInputElement;

    await userEvent.type(nameInput, "John Doe");
    await userEvent.type(emailInput, "john@example.com");
    await userEvent.type(passwordInput, "Password123!");
    await userEvent.type(confirmInput, "Password123!");

    expect(nameInput.value).toBe("John Doe");
    expect(emailInput.value).toBe("john@example.com");
    expect(passwordInput.value).toBe("Password123!");
    expect(confirmInput.value).toBe("Password123!");
  });

  it("should have required attributes on all fields", () => {
    renderRegisterForm();
    expect(screen.getByLabelText("Full Name")).toHaveAttribute("required");
    expect(screen.getByLabelText("Email")).toHaveAttribute("required");
    expect(screen.getByLabelText("Password")).toHaveAttribute("required");
    expect(screen.getByLabelText("Confirm Password")).toHaveAttribute("required");
  });

  it("should have min length on password field", () => {
    renderRegisterForm();
    expect(screen.getByLabelText("Password")).toHaveAttribute("minLength", "8");
  });
});
