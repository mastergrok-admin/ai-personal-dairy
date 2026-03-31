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

const app: Express = express();

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

// Error handling
app.use(errorHandler);

export default app;
