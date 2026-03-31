import crypto from "crypto";
import { prisma } from "../models/prisma.js";
import { NotFoundError, ValidationError, RateLimitError } from "../utils/errors.js";

const TOKEN_EXPIRY_HOURS = 24;
const RESEND_COOLDOWN_MINUTES = 2;

export async function generateVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationExpiry: expiresAt,
    },
  });

  return token;
}

export async function verifyEmail(token: string): Promise<{ id: string; email: string; name: string }> {
  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    throw new NotFoundError("Invalid verification token");
  }

  if (!user.verificationExpiry || user.verificationExpiry < new Date()) {
    throw new ValidationError("Verification token has expired. Please request a new one.");
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationExpiry: null,
    },
  });

  return { id: updated.id, email: updated.email, name: updated.name };
}

export async function resendVerification(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  if (user.emailVerified) {
    throw new ValidationError("Email is already verified");
  }

  // Rate limit: check if last token was generated less than 2 minutes ago
  if (user.verificationExpiry) {
    const tokenCreatedAt = new Date(user.verificationExpiry.getTime() - TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    const cooldownEnd = new Date(tokenCreatedAt.getTime() + RESEND_COOLDOWN_MINUTES * 60 * 1000);
    if (new Date() < cooldownEnd) {
      throw new RateLimitError("Please wait before requesting another verification email");
    }
  }

  return generateVerificationToken(userId);
}
