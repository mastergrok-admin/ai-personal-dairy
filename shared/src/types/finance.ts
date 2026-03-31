export type Relationship = "self" | "spouse" | "parent" | "child" | "sibling" | "other";
export type AccountType = "savings" | "current";
export type LoanType = "home" | "car" | "personal" | "education" | "gold" | "other";

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
