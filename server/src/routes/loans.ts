import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getLoans,
  getLoan,
  createLoan,
  updateLoan,
  deleteLoan,
} from "../controllers/loans.js";

export const loansRouter: RouterType = Router();
loansRouter.use(authenticate);
loansRouter.get("/", getLoans);
loansRouter.post("/", createLoan);
loansRouter.get("/:id", getLoan);
loansRouter.put("/:id", updateLoan);
loansRouter.delete("/:id", deleteLoan);
