import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import passport from "./config/passport.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { rolesRouter } from "./routes/roles.js";
import { permissionsRouter } from "./routes/permissions.js";
import { appSettingsRouter } from "./routes/appSettings.js";
import { invitesRouter } from "./routes/invites.js";
import { familyMembersRouter } from "./routes/familyMembers.js";
import { bankAccountsRouter } from "./routes/bankAccounts.js";
import { creditCardsRouter } from "./routes/creditCards.js";
import { loansRouter } from "./routes/loans.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { remindersRouter } from "./routes/reminders.js";
import { fixedDepositsRouter } from "./routes/fixedDeposits.js";
import { incomeRouter } from "./routes/income.js";
import { expensesRouter } from "./routes/expenses.js";
import { lendingRouter } from "./routes/lending.js";
import { mutualFundsRouter } from "./routes/mutualFunds.js";
import { ppfRouter } from "./routes/ppf.js";
import { epfRouter } from "./routes/epf.js";
import { npsRouter } from "./routes/nps.js";
import { postOfficeRouter } from "./routes/postOffice.js";
import { sgbRouter } from "./routes/sgb.js";
import { chitFundsRouter } from "./routes/chitFunds.js";
import { goldRouter } from "./routes/gold.js";
import { propertiesRouter } from "./routes/properties.js";
import { investmentsRouter } from "./routes/investments.js";
import { insuranceRouter } from "./routes/insurance.js";
import { taxRouter } from "./routes/tax.js";
import { passiveIncomeRouter } from "./routes/passiveIncome.js";

const app: Express = express();

// Serialize BigInt (used for balance fields in Prisma) to Number in JSON responses
app.set("json replacer", (_key: string, value: unknown) =>
  typeof value === "bigint" ? Number(value) : value,
);

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/roles", rolesRouter);
app.use("/api/permissions", permissionsRouter);

app.use("/api/admin/settings", appSettingsRouter);
app.use("/api/invites", invitesRouter);

app.use("/api/family-members", familyMembersRouter);
app.use("/api/bank-accounts", bankAccountsRouter);
app.use("/api/credit-cards", creditCardsRouter);
app.use("/api/loans", loansRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/fixed-deposits", fixedDepositsRouter);
app.use("/api/income", incomeRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/lending", lendingRouter);
app.use("/api/mutual-funds", mutualFundsRouter);
app.use("/api/ppf", ppfRouter);
app.use("/api/epf", epfRouter);
app.use("/api/nps", npsRouter);
app.use("/api/post-office-schemes", postOfficeRouter);
app.use("/api/sgb", sgbRouter);
app.use("/api/chit-funds", chitFundsRouter);
app.use("/api/gold", goldRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/investments", investmentsRouter);
app.use("/api/insurance", insuranceRouter);
app.use("/api/tax", taxRouter);
app.use("/api/passive-income", passiveIncomeRouter);

// Error handling
app.use(errorHandler);

export default app;
