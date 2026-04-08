import { prisma } from "../models/prisma.js";

export async function getInvestmentSummary(userId: string) {
  const [mfs, ppf, epf, nps, po, sgb, gold, properties, chit] = await Promise.all([
    prisma.mutualFund.findMany({ where: { userId, isActive: true }, include: { transactions: true } }),
    prisma.pPFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.ePFAccount.findMany({ where: { userId, isActive: true } }),
    prisma.nPSAccount.findMany({ where: { userId, isActive: true } }),
    prisma.postOfficeScheme.findMany({ where: { userId, isActive: true } }),
    prisma.sGBHolding.findMany({ where: { userId, isActive: true } }),
    prisma.goldHolding.findMany({ where: { userId, isActive: true } }),
    prisma.property.findMany({ where: { userId, isActive: true } }),
    prisma.chitFund.findMany({ where: { userId, isActive: true } }),
  ]);

  // MF logic
  const buyTypes = ["sip", "lumpsum", "bonus"];
  const sellTypes = ["redemption", "switch_out"];
  let mfInvested = 0;
  for (const f of mfs) {
    const buyPaise = f.transactions.filter(t => buyTypes.includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    const sellPaise = f.transactions.filter(t => sellTypes.includes(t.type)).reduce((s, t) => s + Number(t.amount), 0);
    mfInvested += Math.max(0, buyPaise - sellPaise);
  }

  const ppfBal = ppf.reduce((s, a) => s + Number(a.currentBalance), 0);
  const epfBal = epf.reduce((s, a) => s + Number(a.currentBalance), 0);
  const npsCorpus = nps.reduce((s, a) => s + Number(a.currentCorpus), 0);
  const poInvested = po.reduce((s, a) => s + Number(a.amount), 0);
  const poMaturity = po.reduce((s, a) => s + Number(a.maturityAmount), 0);
  const sgbValue = sgb.reduce((s, a) => s + (a.units * Number(a.currentPrice)), 0);
  const goldValue = gold.reduce((s, a) => s + (a.weightGrams * Number(a.currentPricePerGram)), 0);
  const propPurchase = properties.reduce((s, a) => s + Number(a.purchasePrice ?? 0), 0);
  const propCurrent = properties.reduce((s, a) => s + Number(a.currentValue), 0);
  const propRent = properties.reduce((s, a) => s + Number(a.rentalIncome), 0);
  const chitContrib = chit.reduce((s, a) => s + Number(a.monthlyContrib) * a.durationMonths, 0); // Simplified

  const totalInvested = mfInvested + ppfBal + epfBal + npsCorpus + poInvested + (sgb.reduce((s,a) => s + a.units * Number(a.issuePrice), 0)) + (gold.reduce((s,a) => s + a.weightGrams * Number(a.purchasePricePerGram ?? 0), 0)) + propPurchase;
  const totalCurrent = mfInvested + ppfBal + epfBal + npsCorpus + poMaturity + sgbValue + goldValue + propCurrent;

  return {
    mutualFunds: { invested: mfInvested, currentValue: mfInvested }, // MF currentValue needs manual input in this phase or external API
    ppf: { balance: ppfBal },
    epf: { balance: epfBal },
    nps: { corpus: npsCorpus },
    postOffice: { invested: poInvested, maturityValue: poMaturity },
    sgb: { units: sgb.reduce((s,a) => s + a.units, 0), currentValue: sgbValue },
    gold: { weightGrams: gold.reduce((s,a) => s + a.weightGrams, 0), currentValue: goldValue },
    properties: { purchaseValue: propPurchase, currentValue: propCurrent, rentalIncome: propRent },
    chitFunds: { totalContributed: chitContrib },
    total: { invested: totalInvested, currentValue: totalCurrent }
  };
}
