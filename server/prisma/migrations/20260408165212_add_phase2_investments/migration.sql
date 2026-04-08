-- CreateEnum
CREATE TYPE "MFSchemeType" AS ENUM ('equity', 'debt', 'hybrid', 'elss', 'liquid', 'index', 'other');

-- CreateEnum
CREATE TYPE "MFTransactionType" AS ENUM ('sip', 'lumpsum', 'redemption', 'switch_in', 'switch_out', 'dividend', 'bonus');

-- CreateEnum
CREATE TYPE "NPSTier" AS ENUM ('tier1', 'tier2');

-- CreateEnum
CREATE TYPE "PostOfficeSchemeType" AS ENUM ('nsc', 'kvp', 'scss', 'mis', 'td', 'other');

-- CreateEnum
CREATE TYPE "GoldPurity" AS ENUM ('k24', 'k22', 'k18', 'k14', 'other');

-- CreateEnum
CREATE TYPE "GoldStorageLocation" AS ENUM ('home', 'bank_locker', 'relative', 'other');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('residential_flat', 'independent_house', 'plot', 'agricultural_land', 'commercial', 'other');

-- CreateTable
CREATE TABLE "MutualFund" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "fundName" TEXT NOT NULL,
    "amcName" TEXT NOT NULL,
    "schemeType" "MFSchemeType" NOT NULL,
    "folioLast4" TEXT,
    "sipAmount" BIGINT,
    "sipDate" INTEGER,
    "sipStartDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MutualFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MFTransaction" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "type" "MFTransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "units" DOUBLE PRECISION,
    "nav" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MFTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PPFAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "accountLast4" TEXT,
    "bankOrPostOffice" TEXT NOT NULL,
    "openingDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "currentBalance" BIGINT NOT NULL DEFAULT 0,
    "annualContribution" BIGINT NOT NULL DEFAULT 0,
    "balanceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PPFAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EPFAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "uanLast4" TEXT,
    "employerName" TEXT NOT NULL,
    "monthlyEmployeeContrib" BIGINT NOT NULL DEFAULT 0,
    "monthlyEmployerContrib" BIGINT NOT NULL DEFAULT 0,
    "currentBalance" BIGINT NOT NULL DEFAULT 0,
    "balanceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EPFAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NPSAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "pranLast4" TEXT,
    "tier" "NPSTier" NOT NULL,
    "monthlyContrib" BIGINT NOT NULL DEFAULT 0,
    "currentCorpus" BIGINT NOT NULL DEFAULT 0,
    "corpusUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NPSAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostOfficeScheme" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "schemeType" "PostOfficeSchemeType" NOT NULL,
    "certificateLast4" TEXT,
    "amount" BIGINT NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "maturityAmount" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostOfficeScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SGBHolding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "seriesName" TEXT NOT NULL,
    "units" DOUBLE PRECISION NOT NULL,
    "issuePrice" BIGINT NOT NULL,
    "currentPrice" BIGINT NOT NULL DEFAULT 0,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "maturityDate" TIMESTAMP(3) NOT NULL,
    "interestRate" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SGBHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChitFund" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "organizerName" TEXT NOT NULL,
    "totalValue" BIGINT NOT NULL,
    "monthlyContrib" BIGINT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthWon" INTEGER,
    "prizeReceived" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChitFund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoldHolding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "weightGrams" DOUBLE PRECISION NOT NULL,
    "purity" "GoldPurity" NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "purchasePricePerGram" BIGINT,
    "currentPricePerGram" BIGINT NOT NULL DEFAULT 0,
    "priceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storageLocation" "GoldStorageLocation" NOT NULL DEFAULT 'home',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoldHolding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL,
    "description" TEXT NOT NULL,
    "areaValue" DOUBLE PRECISION NOT NULL,
    "areaUnit" TEXT NOT NULL DEFAULT 'sqft',
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" BIGINT,
    "currentValue" BIGINT NOT NULL DEFAULT 0,
    "valueUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rentalIncome" BIGINT NOT NULL DEFAULT 0,
    "saleDeedDate" TIMESTAMP(3),
    "registrationRefLast6" TEXT,
    "linkedLoanId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MutualFund_userId_idx" ON "MutualFund"("userId");

-- CreateIndex
CREATE INDEX "MutualFund_familyMemberId_idx" ON "MutualFund"("familyMemberId");

-- CreateIndex
CREATE INDEX "MFTransaction_fundId_idx" ON "MFTransaction"("fundId");

-- CreateIndex
CREATE INDEX "PPFAccount_userId_idx" ON "PPFAccount"("userId");

-- CreateIndex
CREATE INDEX "EPFAccount_userId_idx" ON "EPFAccount"("userId");

-- CreateIndex
CREATE INDEX "NPSAccount_userId_idx" ON "NPSAccount"("userId");

-- CreateIndex
CREATE INDEX "PostOfficeScheme_userId_idx" ON "PostOfficeScheme"("userId");

-- CreateIndex
CREATE INDEX "SGBHolding_userId_idx" ON "SGBHolding"("userId");

-- CreateIndex
CREATE INDEX "ChitFund_userId_idx" ON "ChitFund"("userId");

-- CreateIndex
CREATE INDEX "GoldHolding_userId_idx" ON "GoldHolding"("userId");

-- CreateIndex
CREATE INDEX "GoldHolding_familyMemberId_idx" ON "GoldHolding"("familyMemberId");

-- CreateIndex
CREATE INDEX "Property_userId_idx" ON "Property"("userId");

-- CreateIndex
CREATE INDEX "Property_familyMemberId_idx" ON "Property"("familyMemberId");

-- AddForeignKey
ALTER TABLE "MutualFund" ADD CONSTRAINT "MutualFund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MutualFund" ADD CONSTRAINT "MutualFund_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MFTransaction" ADD CONSTRAINT "MFTransaction_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "MutualFund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPFAccount" ADD CONSTRAINT "PPFAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PPFAccount" ADD CONSTRAINT "PPFAccount_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EPFAccount" ADD CONSTRAINT "EPFAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EPFAccount" ADD CONSTRAINT "EPFAccount_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPSAccount" ADD CONSTRAINT "NPSAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NPSAccount" ADD CONSTRAINT "NPSAccount_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostOfficeScheme" ADD CONSTRAINT "PostOfficeScheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostOfficeScheme" ADD CONSTRAINT "PostOfficeScheme_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SGBHolding" ADD CONSTRAINT "SGBHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SGBHolding" ADD CONSTRAINT "SGBHolding_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChitFund" ADD CONSTRAINT "ChitFund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChitFund" ADD CONSTRAINT "ChitFund_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldHolding" ADD CONSTRAINT "GoldHolding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoldHolding" ADD CONSTRAINT "GoldHolding_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
