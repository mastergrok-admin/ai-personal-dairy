export type Relationship = "self" | "spouse" | "parent" | "child" | "sibling" | "other";
export type AccountType = "savings" | "current";
export type LoanType = "home" | "car" | "personal" | "education" | "gold" | "other";
export type FDStatus = "active" | "matured" | "broken";

export interface FixedDepositResponse {
  id: string;
  bankAccountId: string;
  fdReferenceNumberLast4: string | null;
  principalAmount: string;   // BigInt serialized as string in JSON
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  maturityDate: string;
  maturityAmount: string;    // BigInt serialized as string in JSON
  autoRenewal: boolean;
  status: FDStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMemberResponse {
  id: string;
  name: string;
  relationship: Relationship;
  createdAt: string;
  updatedAt: string;
  _count?: {
    bankAccounts: number;
    creditCards: number;
    loans: number;
  };
}

export interface BankAccountResponse {
  id: string;
  familyMemberId: string;
  familyMember?: { name: string; relationship: Relationship };
  bankName: string;
  accountType: AccountType;
  accountNumberLast4: string;
  ifscCode: string | null;
  balance: string; // BigInt serialized as string in JSON
  balanceUpdatedAt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fixedDeposits?: FixedDepositResponse[];
}

export interface CreditCardResponse {
  id: string;
  familyMemberId: string;
  familyMember?: { name: string; relationship: Relationship };
  bankName: string;
  cardName: string;
  cardNumberLast4: string;
  creditLimit: string;
  currentDue: string;
  minimumDue: string;
  dueDate: number;
  billingCycleDate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoanResponse {
  id: string;
  familyMemberId: string;
  familyMember?: { name: string; relationship: Relationship };
  lenderName: string;
  loanType: LoanType;
  principalAmount: string;
  outstandingAmount: string;
  emiAmount: string;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
  endDate: string | null;
  emiDueDate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardOverview {
  netWorth: { total: number; assets: number; liabilities: number };
  quickStats: {
    bankBalance: number;
    cardDues: number;
    nextDueDate: string | null;
    nextDueDays: number | null;
    loanEmiTotal: number;
    familyMemberCount: number;
  };
  upcomingDues: Array<{
    type: "credit_card" | "loan";
    name: string;
    amount: number;
    dueDate: number;
    daysLeft: number;
  }>;
  needsAttention: Array<{
    type: "stale_balance" | "overdue";
    title: string;
    description: string;
    entityId?: string;
    entityType?: string;
  }>;
}

export type ReminderType = "credit_card_due" | "loan_emi" | "balance_update" | "custom";
export type ReminderFrequency = "once" | "monthly" | "quarterly" | "yearly";

export interface ReminderResponse {
  id: string;
  type: ReminderType;
  title: string;
  description: string | null;
  linkedEntityId: string | null;
  linkedEntityType: string | null;
  dueDate: string | null;
  recurringDay: number | null;
  frequency: ReminderFrequency;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Phase 1 types ──────────────────────────────────────────────────────────

export type IncomeSource = 'salary' | 'business' | 'rental' | 'freelance' | 'agricultural' | 'pension' | 'other'
export type ExpenseCategory = 'groceries' | 'vegetables_fruits' | 'fuel' | 'transport' | 'school_fees' | 'medical' | 'utilities' | 'internet_mobile' | 'religious' | 'eating_out' | 'clothing' | 'rent' | 'household' | 'other'
export type LendingDirection = 'lent' | 'borrowed'
export type LendingStatus = 'outstanding' | 'partially_repaid' | 'settled'

export interface IncomeResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  source: IncomeSource
  amount: string          // BigInt → string (paise)
  month: number
  year: number
  fiscalYear: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface ExpenseResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  category: ExpenseCategory
  amount: string          // paise
  date: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export interface LendingRepaymentResponse {
  id: string
  amount: string          // paise
  date: string
  notes: string | null
  createdAt: string
}

export interface PersonalLendingResponse {
  id: string
  direction: LendingDirection
  personName: string
  personPhone: string | null
  principalAmount: string   // paise
  outstandingAmount: string // paise — computed: principal - sum(repayments)
  date: string
  purpose: string | null
  expectedRepaymentDate: string | null
  status: LendingStatus
  notes: string | null
  repayments: LendingRepaymentResponse[]
  isActive?: boolean
  createdAt: string
  updatedAt: string
}

export interface NetWorthResponse {
  assets: {
    bankAndFD: number
    investments: number    // 0 until Phase 2
    gold: number           // 0 until Phase 2
    properties: number     // 0 until Phase 2
    lentToOthers: number
  }
  liabilities: {
    loans: number
    creditCards: number
    borrowedFromOthers: number
  }
  netWorth: number
  monthlySummary: {
    month: number
    year: number
    income: number
    expenses: number
    savingsRate: number   // (income - expenses) / income * 100, or 0 if income = 0
  }
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  groceries: 'Groceries & Kirana',
  vegetables_fruits: 'Vegetables & Fruits',
  fuel: 'Fuel',
  transport: 'Auto / Cab / Bus',
  school_fees: 'School & Tuition',
  medical: 'Medical & Medicines',
  utilities: 'Electricity / Gas / Water',
  internet_mobile: 'Internet & Mobile',
  religious: 'Temple & Donations',
  eating_out: 'Eating Out / Delivery',
  clothing: 'Clothing',
  rent: 'Rent',
  household: 'Household & Repairs',
  other: 'Other',
}

export const INCOME_SOURCE_LABELS: Record<IncomeSource, string> = {
  salary: 'Salary',
  business: 'Business / Self-employment',
  rental: 'Rental Income',
  freelance: 'Freelance / Consulting',
  agricultural: 'Agricultural Income',
  pension: 'Pension',
  other: 'Other',
}

// ── Phase 2 — Investments ──────────────────────────────────────────────────

export type MFSchemeType = 'equity' | 'debt' | 'hybrid' | 'elss' | 'liquid' | 'index' | 'other'
export type MFTransactionType = 'sip' | 'lumpsum' | 'redemption' | 'switch_in' | 'switch_out' | 'dividend' | 'bonus'
export type NPSTier = 'tier1' | 'tier2'
export type PostOfficeSchemeType = 'nsc' | 'kvp' | 'scss' | 'mis' | 'td' | 'other'
export type GoldPurity = 'k24' | 'k22' | 'k18' | 'k14' | 'other'
export type GoldStorageLocation = 'home' | 'bank_locker' | 'relative' | 'other'
export type PropertyType = 'residential_flat' | 'independent_house' | 'plot' | 'agricultural_land' | 'commercial' | 'other'

export interface MFTransactionResponse {
  id: string
  fundId: string
  type: MFTransactionType
  amount: number       // paise
  units: number | null
  nav: number | null
  date: string
  notes: string | null
  createdAt: string
}

export interface MutualFundResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  fundName: string
  amcName: string
  schemeType: MFSchemeType
  folioLast4: string | null
  sipAmount: number | null   // paise
  sipDate: number | null
  sipStartDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  transactions: MFTransactionResponse[]
  // computed
  totalUnits: number
  investedPaise: number
  avgBuyPrice: number        // paise per unit
}

export interface PPFAccountResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  accountLast4: string | null
  bankOrPostOffice: string
  openingDate: string
  maturityDate: string
  currentBalance: number     // paise
  annualContribution: number // paise
  balanceUpdatedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface EPFAccountResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  uanLast4: string | null
  employerName: string
  monthlyEmployeeContrib: number // paise
  monthlyEmployerContrib: number // paise
  currentBalance: number         // paise
  balanceUpdatedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface NPSAccountResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  pranLast4: string | null
  tier: NPSTier
  monthlyContrib: number  // paise
  currentCorpus: number   // paise
  corpusUpdatedAt: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PostOfficeSchemeResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  schemeType: PostOfficeSchemeType
  certificateLast4: string | null
  amount: number         // paise — principal
  interestRate: number
  purchaseDate: string
  maturityDate: string
  maturityAmount: number // paise
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SGBHoldingResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  seriesName: string
  units: number
  issuePrice: number   // paise per gram
  currentPrice: number // paise per gram
  issueDate: string
  maturityDate: string
  interestRate: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  // computed
  investedPaise: number
  currentValue: number
}

export interface ChitFundResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  organizerName: string
  totalValue: number     // paise
  monthlyContrib: number // paise
  durationMonths: number
  startDate: string
  endDate: string
  monthWon: number | null
  prizeReceived: number | null // paise
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GoldHoldingResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  description: string
  weightGrams: number
  purity: GoldPurity
  purchaseDate: string | null
  purchasePricePerGram: number | null  // paise
  currentPricePerGram: number          // paise
  priceUpdatedAt: string
  storageLocation: GoldStorageLocation
  isActive: boolean
  createdAt: string
  updatedAt: string
  // computed
  currentValue: number // weightGrams * currentPricePerGram
}

export interface PropertyResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  propertyType: PropertyType
  description: string
  areaValue: number
  areaUnit: string
  purchaseDate: string | null
  purchasePrice: number | null  // paise
  currentValue: number          // paise
  valueUpdatedAt: string
  rentalIncome: number          // paise/month
  saleDeedDate: string | null
  registrationRefLast6: string | null
  linkedLoanId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface InvestmentSummary {
  mutualFunds: { invested: number; currentValue: number }
  ppf: { balance: number }
  epf: { balance: number }
  nps: { corpus: number }
  postOffice: { invested: number; maturityValue: number }
  sgb: { units: number; currentValue: number }
  gold: { weightGrams: number; currentValue: number }
  properties: { purchaseValue: number; currentValue: number; rentalIncome: number }
  chitFunds: { totalContributed: number }
  total: { invested: number; currentValue: number }
}

export const MF_SCHEME_TYPE_LABELS: Record<MFSchemeType, string> = {
  equity: 'Equity Fund',
  debt: 'Debt Fund',
  hybrid: 'Hybrid Fund',
  elss: 'ELSS (Tax Saver)',
  liquid: 'Liquid Fund',
  index: 'Index Fund',
  other: 'Other',
}

export const POST_OFFICE_SCHEME_LABELS: Record<PostOfficeSchemeType, string> = {
  nsc: 'NSC (National Savings Certificate)',
  kvp: 'KVP (Kisan Vikas Patra)',
  scss: 'SCSS (Senior Citizen Savings)',
  mis: 'MIS (Monthly Income Scheme)',
  td: 'Time Deposit',
  other: 'Other',
}

export const GOLD_PURITY_LABELS: Record<GoldPurity, string> = {
  k24: '24K (Pure Gold)',
  k22: '22K',
  k18: '18K',
  k14: '14K',
  other: 'Other',
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  residential_flat: 'Residential Flat / Apartment',
  independent_house: 'Independent House / Villa',
  plot: 'Plot / Land',
  agricultural_land: 'Agricultural Land',
  commercial: 'Commercial Property',
  other: 'Other',
}

export const INDIAN_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Union Bank of India",
  "Canara Bank",
  "IndusInd Bank",
  "Yes Bank",
  "IDBI Bank",
  "Bank of India",
  "Federal Bank",
  "RBL Bank",
  "South Indian Bank",
  "Karur Vysya Bank",
  "AU Small Finance Bank",
  "Bandhan Bank",
  "IDFC First Bank",
] as const;

// ── Phase 3 — Tax, Insurance, Passive Income ──────────────────────────────

export type InsuranceType =
  | 'term_life' | 'whole_life' | 'ulip'
  | 'health_individual' | 'health_family_floater'
  | 'vehicle_car' | 'vehicle_two_wheeler'
  | 'property' | 'pmjjby' | 'pmsby' | 'other'

export type PremiumFrequency = 'monthly' | 'quarterly' | 'half_yearly' | 'annual' | 'single'

export type TaxRegime = 'old' | 'new'

export type ManualDeductionSection =
  | 'sec80C_nsc' | 'sec80C_kvp' | 'sec80C_children_tuition' | 'sec80C_other'
  | 'sec80D_self_family' | 'sec80D_parents' | 'sec80D_parents_senior'
  | 'sec80E_education_loan_interest' | 'sec80G_donation'
  | 'sec24b_home_loan_interest' | 'hra' | 'other'

export type PassiveIncomeType =
  | 'dividend_stock' | 'dividend_mf'
  | 'interest_fd' | 'interest_savings' | 'interest_nsc' | 'interest_ppf'
  | 'sgb_interest' | 'other'

export interface InsurancePolicyResponse {
  id: string
  familyMemberId: string
  familyMember?: { name: string; relationship: Relationship }
  insuranceType: InsuranceType
  insurerName: string
  policyLast6: string | null
  sumAssured: number        // paise
  premiumAmount: number     // paise per frequency period
  premiumFrequency: PremiumFrequency
  startDate: string
  renewalDate: string
  nomineeName: string | null
  notes: string | null
  daysUntilRenewal: number
  renewalSoon: boolean      // daysUntilRenewal <= 30
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxDeductionResponse {
  id: string
  fiscalYear: string
  section: ManualDeductionSection
  amount: number            // paise
  description: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface TaxProfileResponse {
  id: string
  fiscalYear: string
  preferredRegime: TaxRegime
}

export interface TaxSummaryResponse {
  fiscalYear: string
  regime: TaxRegime
  income: {
    salary: number; business: number; rental: number; other: number
    agriculturalIncome: number; total: number
  }
  deductions: {
    epf: number; ppf: number; elss: number; nsc: number; kvp: number
    homeLoanPrincipal: number; lifeInsurance: number; childrenTuition: number
    sec80C_other: number; sec80C_total: number; sec80C_max: number
    sec80C_remaining: number
    sec80D: number; sec80E: number; sec80G: number; sec24b: number; hra: number
    totalDeductions: number
  }
  taxableIncome: { old: number; new: number }
  taxLiability: { old: number; new: number }
  advanceTax: {
    required: boolean
    q1_by: string; q1_amount: number
    q2_by: string; q2_amount: number
    q3_by: string; q3_amount: number
    q4_by: string; q4_amount: number
  }
  form15GH: {
    fdAccounts: Array<{
      bankName: string; accountLast4: string
      annualInterest: number; tdsRisk: boolean
    }>
  }
  manualDeductions: TaxDeductionResponse[]
}

export interface PassiveIncomeResponse {
  id: string
  incomeType: PassiveIncomeType
  amount: number            // paise
  date: string
  source: string
  tdsDeducted: number       // paise
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PassiveIncomeSummaryResponse {
  fiscalYear: string
  totalAmount: number       // paise
  totalTdsDeducted: number  // paise
  byType: Array<{ type: PassiveIncomeType; amount: number; tdsDeducted: number }>
}

export const INSURANCE_TYPE_LABELS: Record<InsuranceType, string> = {
  term_life: 'Term Life Insurance',
  whole_life: 'Whole Life / Endowment',
  ulip: 'ULIP',
  health_individual: 'Health Insurance (Individual)',
  health_family_floater: 'Health Insurance (Family Floater)',
  vehicle_car: 'Car Insurance',
  vehicle_two_wheeler: 'Two-Wheeler Insurance',
  property: 'Property Insurance',
  pmjjby: 'PMJJBY',
  pmsby: 'PMSBY',
  other: 'Other',
}

export const PREMIUM_FREQUENCY_LABELS: Record<PremiumFrequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_yearly: 'Half-Yearly',
  annual: 'Annual',
  single: 'Single Premium',
}

export const MANUAL_DEDUCTION_LABELS: Record<ManualDeductionSection, string> = {
  sec80C_nsc: '80C — NSC',
  sec80C_kvp: '80C — KVP',
  sec80C_children_tuition: '80C — Children Tuition',
  sec80C_other: '80C — Other',
  sec80D_self_family: '80D — Health (Self & Family)',
  sec80D_parents: '80D — Health (Parents)',
  sec80D_parents_senior: '80D — Health (Senior Citizen Parents)',
  sec80E_education_loan_interest: '80E — Education Loan Interest',
  sec80G_donation: '80G — Donations',
  sec24b_home_loan_interest: '24b — Home Loan Interest',
  hra: 'HRA',
  other: 'Other',
}

export const PASSIVE_INCOME_TYPE_LABELS: Record<PassiveIncomeType, string> = {
  dividend_stock: 'Dividend — Stocks',
  dividend_mf: 'Dividend — Mutual Funds',
  interest_fd: 'Interest — Fixed Deposit',
  interest_savings: 'Interest — Savings Account',
  interest_nsc: 'Interest — NSC',
  interest_ppf: 'Interest — PPF (Tax Exempt)',
  sgb_interest: 'SGB Interest',
  other: 'Other',
}
