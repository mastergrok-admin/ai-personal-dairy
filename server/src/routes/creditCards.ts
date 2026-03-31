import { Router, type Router as RouterType } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getCreditCards,
  getCreditCard,
  createCreditCard,
  updateCreditCard,
  deleteCreditCard,
} from "../controllers/creditCards.js";

export const creditCardsRouter: RouterType = Router();
creditCardsRouter.use(authenticate);
creditCardsRouter.get("/", getCreditCards);
creditCardsRouter.post("/", createCreditCard);
creditCardsRouter.get("/:id", getCreditCard);
creditCardsRouter.put("/:id", updateCreditCard);
creditCardsRouter.delete("/:id", deleteCreditCard);
