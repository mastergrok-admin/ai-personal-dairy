import type { Request } from "express";
import { z } from "zod";
import * as usersService from "../services/users.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { NotFoundError } from "../utils/errors.js";

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
});

const assignRolesSchema = z.object({
  roleIds: z.array(z.string()),
});

export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string | undefined;

  const result = await usersService.listUsers(page, limit, search);
  res.json({ success: true, ...result });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await usersService.getUserById(getParam(req.params.id));
  if (!user) {
    throw new NotFoundError("User not found");
  }
  res.json({ success: true, data: user });
});

export const updateUser = asyncHandler(async (req, res) => {
  const data = updateUserSchema.parse(req.body);
  const user = await usersService.updateUser(getParam(req.params.id), data);
  res.json({ success: true, data: user });
});

export const deleteUser = asyncHandler(async (req: Request, res) => {
  await usersService.deactivateUser(getParam(req.params.id));
  res.json({ success: true });
});

export const assignRoles = asyncHandler(async (req, res) => {
  const { roleIds } = assignRolesSchema.parse(req.body);
  const user = await usersService.assignRoles(getParam(req.params.id), roleIds);
  res.json({ success: true, data: user });
});
