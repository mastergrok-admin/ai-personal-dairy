import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AnimatedCounter } from "@/components/ui/animated-counter";

describe("AnimatedCounter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts near 0 and reaches target value", async () => {
    render(<AnimatedCounter value={1000} duration={100} />);
    // After full duration, counter should show 1,000
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("1,000")).toBeDefined();
  });

  it("uses custom formatter when provided", async () => {
    render(
      <AnimatedCounter
        value={500}
        duration={100}
        formatter={(v) => `₹${v}`}
      />
    );
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("₹500")).toBeDefined();
  });
});
