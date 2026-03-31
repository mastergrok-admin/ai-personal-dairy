import crypto from "crypto";
import { prisma } from "../models/prisma.js";
import { ConflictError, NotFoundError, ValidationError, ForbiddenError } from "../utils/errors.js";
import * as appSettingsService from "./appSettings.js";

const INVITE_EXPIRY_DAYS = 7;

export async function createInvite(
  inviterId: string,
  email: string,
  roleId?: string,
  isAdmin = false,
): Promise<{ id: string; email: string; token: string; status: string; expiresAt: Date; roleId: string | null }> {
  // Check feature flag for non-admin users
  if (!isAdmin) {
    const enabled = await appSettingsService.getSetting("userInvitesEnabled");
    if (enabled !== "true") {
      throw new ForbiddenError("User invites are currently disabled");
    }
  }

  // Check for existing pending invite to same email
  const existing = await prisma.invite.findFirst({
    where: { email, status: "pending" },
  });
  if (existing) {
    throw new ConflictError("A pending invite already exists for this email");
  }

  // Check if user already registered
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError("A user with this email already exists");
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);

  const invite = await prisma.invite.create({
    data: {
      email,
      token,
      roleId: isAdmin ? roleId : undefined,
      invitedById: inviterId,
      expiresAt,
    },
  });

  return invite;
}

export async function getInvitesByUser(userId: string) {
  return prisma.invite.findMany({
    where: { invitedById: userId },
    orderBy: { createdAt: "desc" },
    include: { role: true },
  });
}

export async function acceptInvite(token: string): Promise<{ email: string; roleId: string | null }> {
  const invite = await prisma.invite.findUnique({
    where: { token },
  });

  if (!invite) {
    throw new NotFoundError("Invalid invite token");
  }

  if (invite.status !== "pending") {
    throw new ValidationError("This invite has already been used or expired");
  }

  if (invite.expiresAt < new Date()) {
    await prisma.invite.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    throw new ValidationError("This invite has expired");
  }

  return { email: invite.email, roleId: invite.roleId };
}

export async function markInviteAccepted(email: string): Promise<void> {
  await prisma.invite.updateMany({
    where: { email, status: "pending" },
    data: { status: "accepted" },
  });
}
