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
