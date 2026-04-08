-- CreateEnum
CREATE TYPE "IncomeSource" AS ENUM ('salary', 'business', 'rental', 'freelance', 'agricultural', 'pension', 'other');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('groceries', 'vegetables_fruits', 'fuel', 'transport', 'school_fees', 'medical', 'utilities', 'internet_mobile', 'religious', 'eating_out', 'clothing', 'rent', 'household', 'other');

-- CreateEnum
CREATE TYPE "LendingDirection" AS ENUM ('lent', 'borrowed');

-- CreateEnum
CREATE TYPE "LendingStatus" AS ENUM ('outstanding', 'partially_repaid', 'settled');

-- CreateTable
CREATE TABLE "Income" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "source" "IncomeSource" NOT NULL,
    "amount" BIGINT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalLending" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "direction" "LendingDirection" NOT NULL,
    "personName" TEXT NOT NULL,
    "personPhone" TEXT,
    "principalAmount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "purpose" TEXT,
    "expectedRepaymentDate" TIMESTAMP(3),
    "status" "LendingStatus" NOT NULL DEFAULT 'outstanding',
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalLending_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LendingRepayment" (
    "id" TEXT NOT NULL,
    "lendingId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LendingRepayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Income_userId_idx" ON "Income"("userId");

-- CreateIndex
CREATE INDEX "Income_userId_fiscalYear_idx" ON "Income"("userId", "fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "Income_userId_familyMemberId_source_month_year_key" ON "Income"("userId", "familyMemberId", "source", "month", "year");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_userId_date_idx" ON "Expense"("userId", "date");

-- CreateIndex
CREATE INDEX "PersonalLending_userId_idx" ON "PersonalLending"("userId");

-- CreateIndex
CREATE INDEX "PersonalLending_userId_status_idx" ON "PersonalLending"("userId", "status");

-- CreateIndex
CREATE INDEX "LendingRepayment_lendingId_idx" ON "LendingRepayment"("lendingId");

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Income" ADD CONSTRAINT "Income_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalLending" ADD CONSTRAINT "PersonalLending_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LendingRepayment" ADD CONSTRAINT "LendingRepayment_lendingId_fkey" FOREIGN KEY ("lendingId") REFERENCES "PersonalLending"("id") ON DELETE CASCADE ON UPDATE CASCADE;
