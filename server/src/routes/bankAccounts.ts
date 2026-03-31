import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getBankAccounts,
  getBankAccount,
  createBankAccount,
  updateBankAccount,
  updateBalance,
  deleteBankAccount,
} from "../controllers/bankAccounts.js";

export const bankAccountsRouter: RouterType = Router();

bankAccountsRouter.use(authenticate);
bankAccountsRouter.get("/", getBankAccounts);
bankAccountsRouter.post("/", createBankAccount);
bankAccountsRouter.get("/:id", getBankAccount);
bankAccountsRouter.put("/:id", updateBankAccount);
bankAccountsRouter.put("/:id/balance", updateBalance);
bankAccountsRouter.delete("/:id", deleteBankAccount);
