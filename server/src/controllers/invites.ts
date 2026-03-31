import { z } from "zod";
import * as invitesService from "../services/invites.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { sendInviteEmail } from "../services/email.js";
import { prisma } from "../models/prisma.js";
import { env } from "../config/env.js";
import { ValidationError } from "../utils/errors.js";

const createInviteSchema = z.object({
  email: z.string().email(),
  roleId: z.string().optional(),
});

export const createInvite = asyncHandler(async (req, res) => {
  const { email, roleId } = createInviteSchema.parse(req.body);
  const userId = (req as AuthenticatedRequest).userId;

  // Determine if user is admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: { permissions: { include: { permission: true } } },
          },
        },
      },
    },
  });

  const permissions = user?.roles.flatMap((ur) =>
    ur.role.permissions.map((rp) => rp.permission.name),
  ) ?? [];
  const isAdmin = permissions.includes("admin.dashboard");

  const invite = await invitesService.createInvite(userId, email, roleId, isAdmin);

  // Get role name for email
  let roleName: string | undefined;
  if (invite.roleId) {
    const role = await prisma.role.findUnique({ where: { id: invite.roleId } });
    roleName = role?.name;
  }

  // Send invite email (fire-and-forget)
  const inviterName = user?.name ?? "Someone";
  void sendInviteEmail(inviterName, email, invite.token, roleName);

  res.status(201).json({ success: true, data: invite });
});

export const getMyInvites = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const invites = await invitesService.getInvitesByUser(userId);
  res.json({ success: true, data: invites });
});

export const acceptInviteHandler = asyncHandler(async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    throw new ValidationError("Invite token is required");
  }

  const { email, roleId } = await invitesService.acceptInvite(token);

  // Redirect to register page with invite info
  const params = new URLSearchParams({ invite: token, email });
  if (roleId) params.set("roleId", roleId);
  res.redirect(`${env.CLIENT_URL}/register?${params.toString()}`);
});
