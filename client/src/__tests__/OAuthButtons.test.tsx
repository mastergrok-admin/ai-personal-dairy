import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OAuthButtons } from "@/components/features/auth/OAuthButtons";

describe("OAuthButtons", () => {
  it("should render Google sign in button", () => {
    render(<OAuthButtons />);
    expect(screen.getByText("Sign in with Google")).toBeDefined();
  });

  it("should render Microsoft sign in button", () => {
    render(<OAuthButtons />);
    expect(screen.getByText("Sign in with Microsoft")).toBeDefined();
  });

  it("should link to the correct OAuth endpoints", () => {
    render(<OAuthButtons />);

    const googleLink = screen.getByText("Sign in with Google").closest("a");
    const microsoftLink = screen.getByText("Sign in with Microsoft").closest("a");

    expect(googleLink?.getAttribute("href")).toContain("/auth/google");
    expect(microsoftLink?.getAttribute("href")).toContain("/auth/microsoft");
  });
});
