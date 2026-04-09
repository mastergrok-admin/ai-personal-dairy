-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('term_life', 'whole_life', 'ulip', 'health_individual', 'health_family_floater', 'vehicle_car', 'vehicle_two_wheeler', 'property', 'pmjjby', 'pmsby', 'other');

-- CreateEnum
CREATE TYPE "PremiumFrequency" AS ENUM ('monthly', 'quarterly', 'half_yearly', 'annual', 'single');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('old', 'new');

-- CreateEnum
CREATE TYPE "ManualDeductionSection" AS ENUM ('sec80C_nsc', 'sec80C_kvp', 'sec80C_children_tuition', 'sec80C_other', 'sec80D_self_family', 'sec80D_parents', 'sec80D_parents_senior', 'sec80E_education_loan_interest', 'sec80G_donation', 'sec24b_home_loan_interest', 'hra', 'other');

-- CreateEnum
CREATE TYPE "PassiveIncomeType" AS ENUM ('dividend_stock', 'dividend_mf', 'interest_fd', 'interest_savings', 'interest_nsc', 'interest_ppf', 'sgb_interest', 'other');

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "insuranceType" "InsuranceType" NOT NULL,
    "insurerName" TEXT NOT NULL,
    "policyLast6" TEXT,
    "sumAssured" BIGINT NOT NULL,
    "premiumAmount" BIGINT NOT NULL,
    "premiumFrequency" "PremiumFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "renewalDate" TIMESTAMP(3) NOT NULL,
    "nomineeName" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "preferredRegime" "TaxRegime" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxDeduction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "section" "ManualDeductionSection" NOT NULL,
    "amount" BIGINT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassiveIncome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incomeType" "PassiveIncomeType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "tdsDeducted" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassiveIncome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InsurancePolicy_userId_idx" ON "InsurancePolicy"("userId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_familyMemberId_idx" ON "InsurancePolicy"("familyMemberId");

-- CreateIndex
CREATE INDEX "InsurancePolicy_userId_renewalDate_idx" ON "InsurancePolicy"("userId", "renewalDate");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_userId_key" ON "TaxProfile"("userId");

-- CreateIndex
CREATE INDEX "TaxDeduction_userId_fiscalYear_idx" ON "TaxDeduction"("userId", "fiscalYear");

-- CreateIndex
CREATE INDEX "PassiveIncome_userId_idx" ON "PassiveIncome"("userId");

-- CreateIndex
CREATE INDEX "PassiveIncome_userId_date_idx" ON "PassiveIncome"("userId", "date");

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxProfile" ADD CONSTRAINT "TaxProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxDeduction" ADD CONSTRAINT "TaxDeduction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassiveIncome" ADD CONSTRAINT "PassiveIncome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
