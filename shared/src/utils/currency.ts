export function paiseToRupees(paise: number | bigint): number {
  return Number(paise) / 100;
}

export function rupeesToPaise(rupees: number): bigint {
  return BigInt(Math.round(rupees * 100));
}

export function formatINR(paise: number | bigint): string {
  const rupees = Number(paise) / 100;
  const isNegative = rupees < 0;
  const abs = Math.abs(rupees);

  const [intPart, decPart] = abs.toFixed(0).split(".");

  // Indian grouping: last 3 digits, then groups of 2
  let formatted: string;
  if (intPart.length <= 3) {
    formatted = intPart;
  } else {
    const last3 = intPart.slice(-3);
    const remaining = intPart.slice(0, -3);
    const groups = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formatted = `${groups},${last3}`;
  }

  const result = decPart ? `${formatted}.${decPart}` : formatted;
  return `${isNegative ? "-" : ""}₹${result}`;
}
