import { describe, it, expect } from "vitest";
import { calculateFDMaturityAmount, calculateFDTenureMonths } from "../utils/fd";

describe("calculateFDTenureMonths", () => {
  it("calculates full months between two dates", () => {
    const start = new Date("2024-01-15");
    const end = new Date("2026-01-15");
    expect(calculateFDTenureMonths(start, end)).toBe(24);
  });

  it("calculates partial year correctly", () => {
    const start = new Date("2024-03-01");
    const end = new Date("2025-09-01");
    expect(calculateFDTenureMonths(start, end)).toBe(18);
  });

  it("returns 0 for same month", () => {
    const start = new Date("2024-03-01");
    const end = new Date("2024-03-15");
    expect(calculateFDTenureMonths(start, end)).toBe(0);
  });

  it("returns 1 for exactly one calendar month", () => {
    const start = new Date("2024-01-01");
    const end = new Date("2024-02-01");
    expect(calculateFDTenureMonths(start, end)).toBe(1);
  });
});

describe("calculateFDMaturityAmount", () => {
  it("calculates quarterly compounded maturity for 1 year", () => {
    // P=100000, r=7%, n=4, t=1 => 100000 * (1 + 0.07/4)^4 ≈ 107186
    const result = calculateFDMaturityAmount(100000, 7, new Date("2024-01-01"), new Date("2025-01-01"));
    expect(result).toBeCloseTo(107186, -2);
  });

  it("calculates maturity for 2 years", () => {
    // P=200000, r=7.1%, quarterly, t≈2yr (365.25-day year) => ≈230251
    const result = calculateFDMaturityAmount(200000, 7.1, new Date("2024-01-15"), new Date("2026-01-15"));
    expect(result).toBeCloseTo(230251, -2);
  });
});
