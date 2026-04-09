-- CreateEnum
CREATE TYPE "GoalCategory" AS ENUM ('home_purchase', 'vehicle', 'education', 'wedding', 'retirement', 'emergency_fund', 'travel', 'medical', 'other');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('car', 'two_wheeler', 'commercial', 'tractor', 'other');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('petrol', 'diesel', 'cng', 'electric', 'hybrid', 'other');

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "budgetAmount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GoalCategory" NOT NULL,
    "targetAmount" BIGINT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "currentAmount" BIGINT NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isAchieved" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyMemberId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "yearOfManufacture" INTEGER NOT NULL,
    "registrationLast4" TEXT,
    "fuelType" "FuelType" NOT NULL,
    "purchaseDate" TIMESTAMP(3),
    "purchasePrice" BIGINT,
    "currentValue" BIGINT NOT NULL DEFAULT 0,
    "linkedLoanId" TEXT,
    "insurancePolicyId" TEXT,
    "pucExpiryDate" TIMESTAMP(3),
    "rcRenewalDate" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleService" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "odometer" INTEGER,
    "serviceCentre" TEXT,
    "cost" BIGINT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_month_year_key" ON "Budget"("userId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetItem_budgetId_category_key" ON "BudgetItem"("budgetId", "category");

-- CreateIndex
CREATE INDEX "FinancialGoal_userId_idx" ON "FinancialGoal"("userId");

-- CreateIndex
CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");

-- CreateIndex
CREATE INDEX "Vehicle_familyMemberId_idx" ON "Vehicle"("familyMemberId");

-- CreateIndex
CREATE INDEX "VehicleService_vehicleId_idx" ON "VehicleService"("vehicleId");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialGoal" ADD CONSTRAINT "FinancialGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_familyMemberId_fkey" FOREIGN KEY ("familyMemberId") REFERENCES "FamilyMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleService" ADD CONSTRAINT "VehicleService_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
