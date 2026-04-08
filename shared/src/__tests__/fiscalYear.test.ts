import { describe, it, expect } from "vitest";
import { toFiscalYear, currentFiscalYear } from "../utils/fiscalYear";

describe("toFiscalYear", () => {
  it("April–December belong to the year that starts in April", () => {
    expect(toFiscalYear(4, 2025)).toBe("2025-26");
    expect(toFiscalYear(12, 2025)).toBe("2025-26");
  });
  it("January–March belong to the previous FY start", () => {
    expect(toFiscalYear(1, 2026)).toBe("2025-26");
    expect(toFiscalYear(3, 2026)).toBe("2025-26");
  });
  it("April is the first month of a new FY", () => {
    expect(toFiscalYear(4, 2026)).toBe("2026-27");
  });
});

describe("currentFiscalYear", () => {
  it("returns a string matching YYYY-YY pattern", () => {
    expect(currentFiscalYear()).toMatch(/^\d{4}-\d{2}$/);
  });
});
