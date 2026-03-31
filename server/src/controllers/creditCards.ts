import { z } from "zod";
import * as creditCardsService from "../services/creditCards.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  bankName: z.string().min(1),
  cardName: z.string().min(1),
  cardNumberLast4: z.string().length(4),
  creditLimit: z.number().min(0),
  currentDue: z.number().min(0),
  minimumDue: z.number().min(0),
  dueDate: z.number().int().min(1).max(31),
  billingCycleDate: z.number().int().min(1).max(31),
});

const updateSchema = z.object({
  bankName: z.string().min(1).optional(),
  cardName: z.string().min(1).optional(),
  cardNumberLast4: z.string().length(4).optional(),
  creditLimit: z.number().min(0).optional(),
  currentDue: z.number().min(0).optional(),
  minimumDue: z.number().min(0).optional(),
  dueDate: z.number().int().min(1).max(31).optional(),
  billingCycleDate: z.number().int().min(1).max(31).optional(),
  isActive: z.boolean().optional(),
});

export const getCreditCards = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const familyMemberId = req.query.familyMemberId as string | undefined;
  const cards = await creditCardsService.listCreditCards(userId, familyMemberId);
  res.json({ success: true, data: cards });
});

export const getCreditCard = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const card = await creditCardsService.getCreditCard(getParam(req.params.id), userId);
  if (!card) {
    throw new NotFoundError("Credit card not found");
  }
  res.json({ success: true, data: card });
});

export const createCreditCard = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createSchema.parse(req.body);
  const card = await creditCardsService.createCreditCard(userId, {
    ...data,
    creditLimit: BigInt(Math.round(data.creditLimit * 100)),
    currentDue: BigInt(Math.round(data.currentDue * 100)),
    minimumDue: BigInt(Math.round(data.minimumDue * 100)),
  });
  res.status(201).json({ success: true, data: card });
});

export const updateCreditCard = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateSchema.parse(req.body);
  const updateData: Parameters<typeof creditCardsService.updateCreditCard>[2] = {
    bankName: data.bankName,
    cardName: data.cardName,
    cardNumberLast4: data.cardNumberLast4,
    dueDate: data.dueDate,
    billingCycleDate: data.billingCycleDate,
    isActive: data.isActive,
    ...(data.creditLimit !== undefined
      ? { creditLimit: BigInt(Math.round(data.creditLimit * 100)) }
      : {}),
    ...(data.currentDue !== undefined
      ? { currentDue: BigInt(Math.round(data.currentDue * 100)) }
      : {}),
    ...(data.minimumDue !== undefined
      ? { minimumDue: BigInt(Math.round(data.minimumDue * 100)) }
      : {}),
  };
  const card = await creditCardsService.updateCreditCard(
    getParam(req.params.id),
    userId,
    updateData,
  );
  res.json({ success: true, data: card });
});

export const deleteCreditCard = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await creditCardsService.deleteCreditCard(getParam(req.params.id), userId);
  res.json({ success: true });
});
