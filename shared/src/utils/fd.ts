/**
 * Calculates the number of whole months between two dates.
 */
export function calculateFDTenureMonths(startDate: Date, maturityDate: Date): number {
  return (
    (maturityDate.getFullYear() - startDate.getFullYear()) * 12 +
    (maturityDate.getMonth() - startDate.getMonth())
  );
}

/**
 * Calculates FD maturity amount using quarterly compounding (standard Indian banks).
 * Formula: M = P × (1 + r/400)^(4 × t)
 * where P = principal (rupees), r = annual interest rate (%), t = tenure in years.
 * Returns amount in rupees (same unit as input).
 */
export function calculateFDMaturityAmount(
  principalRupees: number,
  annualRatePercent: number,
  startDate: Date,
  maturityDate: Date,
): number {
  const tenureYears =
    (maturityDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.round(principalRupees * Math.pow(1 + annualRatePercent / 400, 4 * tenureYears));
}
