export function toFiscalYear(month: number, year: number): string {
  const fyStartYear = month <= 3 ? year - 1 : year;
  return `${fyStartYear}-${String(fyStartYear + 1).slice(2)}`;
}

export function currentFiscalYear(): string {
  const now = new Date();
  return toFiscalYear(now.getMonth() + 1, now.getFullYear());
}
