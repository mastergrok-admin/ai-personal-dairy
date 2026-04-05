import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/hooks/useTheme";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to dark when localStorage is empty", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("dark");
  });

  it("reads initial theme from localStorage", () => {
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("light");
  });

  it("applies dark class to documentElement when theme is dark", () => {
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
    localStorage.setItem("theme", "light");
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("toggleTheme switches from dark to light", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("toggleTheme persists to localStorage", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.toggleTheme());
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
