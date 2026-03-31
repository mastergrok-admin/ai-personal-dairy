import { describe, it, expect } from "vitest";
import { formatINR, paiseToRupees, rupeesToPaise } from "../utils/currency.js";

describe("Currency Utilities", () => {
  describe("paiseToRupees", () => {
    it("converts paise to rupees", () => {
      expect(paiseToRupees(12500000)).toBe(125000);
    });

    it("handles zero", () => {
      expect(paiseToRupees(0)).toBe(0);
    });

    it("handles BigInt", () => {
      expect(paiseToRupees(BigInt(12500000))).toBe(125000);
    });
  });

  describe("rupeesToPaise", () => {
    it("converts rupees to paise BigInt", () => {
      expect(rupeesToPaise(125000)).toBe(BigInt(12500000));
    });

    it("handles decimal rupees", () => {
      expect(rupeesToPaise(125000.50)).toBe(BigInt(12500050));
    });

    it("handles zero", () => {
      expect(rupeesToPaise(0)).toBe(BigInt(0));
    });
  });

  describe("formatINR", () => {
    it("formats with Indian grouping", () => {
      expect(formatINR(12500000)).toBe("₹1,25,000");
    });

    it("formats lakhs", () => {
      expect(formatINR(100000000)).toBe("₹10,00,000");
    });

    it("formats crores", () => {
      expect(formatINR(1000000000)).toBe("₹1,00,00,000");
    });

    it("formats small amounts", () => {
      expect(formatINR(50000)).toBe("₹500");
    });

    it("formats zero", () => {
      expect(formatINR(0)).toBe("₹0");
    });

    it("formats negative amounts", () => {
      expect(formatINR(-12500000)).toBe("-₹1,25,000");
    });

    it("handles BigInt input", () => {
      expect(formatINR(BigInt(12500000))).toBe("₹1,25,000");
    });
  });
});
