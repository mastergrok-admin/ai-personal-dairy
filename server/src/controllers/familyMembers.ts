import { z } from "zod";
import * as familyMembersService from "../services/familyMembers.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  relationship: z.enum(["self", "spouse", "parent", "child", "sibling", "other"]),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  relationship: z.enum(["self", "spouse", "parent", "child", "sibling", "other"]).optional(),
});

export const getFamilyMembers = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  await familyMembersService.ensureSelfMember(userId);
  const members = await familyMembersService.listFamilyMembers(userId);
  res.json({ success: true, data: members });
});

export const createFamilyMember = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = createSchema.parse(req.body);
  const member = await familyMembersService.createFamilyMember(userId, data);
  res.status(201).json({ success: true, data: member });
});

export const updateFamilyMember = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const data = updateSchema.parse(req.body);
  const member = await familyMembersService.updateFamilyMember(
    getParam(req.params.id),
    userId,
    data,
  );
  res.json({ success: true, data: member });
});

export const deleteFamilyMember = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const result = await familyMembersService.deleteFamilyMember(
    getParam(req.params.id),
    userId,
  );
  if (!result) {
    throw new NotFoundError("Family member not found");
  }
  res.json({ success: true });
});
