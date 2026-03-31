import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import passport from "../config/passport.js";
import { prisma } from "../models/prisma.js";
import {
  hashPassword,
  generateAccessToken,
  generateRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getUserWithRolesAndPermissions,
  assignDefaultRole,
} from "../services/auth.js";
import { env } from "../config/env.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from "../utils/errors.js";
import { generateVerificationToken, verifyEmail as verifyEmailService, resendVerification } from "../services/verification.js";
import { sendWelcomeEmail, sendVerificationEmail } from "../services/email.js";
import { markInviteAccepted } from "../services/invites.js";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  inviteToken: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new ConflictError("Email already registered");
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      passwordHash,
      provider: "local",
    },
  });

  await assignDefaultRole(user.id);

  // Generate verification token and send emails (fire-and-forget for sends)
  const verificationToken = await generateVerificationToken(user.id);
  void sendVerificationEmail({ name: user.name, email: user.email }, verificationToken);
  void sendWelcomeEmail({ name: user.name, email: user.email });

  // Handle invite token — assign invited role if present
  if (data.inviteToken) {
    const invite = await prisma.invite.findUnique({
      where: { token: data.inviteToken, status: "pending" },
    });
    if (invite?.roleId) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: invite.roleId } },
        update: {},
        create: { userId: user.id, roleId: invite.roleId },
      });
    }
    await markInviteAccepted(data.email);
  }

  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await generateRefreshToken(user.id);
  setAuthCookies(res, accessToken, refreshToken);

  const authData = await getUserWithRolesAndPermissions(user.id);
  res.status(201).json({ success: true, data: authData });
});

export function login(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    loginSchema.parse(req.body);
  } catch (error) {
    next(error);
    return;
  }

  passport.authenticate(
    "local",
    { session: false },
    async (
      err: Error | null,
      user: { id: string; email: string } | false,
      info: { message: string } | undefined,
    ) => {
      if (err) return next(err);
      if (!user) {
        res.status(401).json({
          success: false,
          error: info?.message || "Invalid email or password",
        });
        return;
      }

      try {
        const accessToken = generateAccessToken(user.id, user.email);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);

        const authData = await getUserWithRolesAndPermissions(user.id);
        res.json({ success: true, data: authData });
      } catch (error) {
        next(error);
      }
    },
  )(req, res, next);
}

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  clearAuthCookies(res);
  res.json({ success: true });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    throw new UnauthorizedError("No refresh token");
  }

  const tokens = await rotateRefreshToken(refreshToken);
  if (!tokens) {
    clearAuthCookies(res);
    throw new UnauthorizedError("Invalid refresh token");
  }

  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.json({ success: true });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).userId;
  const authData = await getUserWithRolesAndPermissions(userId);

  if (!authData) {
    throw new NotFoundError("User not found");
  }

  res.json({ success: true, data: authData });
});

// Google OAuth handlers
export function googleAuth(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate("google", { scope: ["profile", "email"], session: false })(req, res, next);
}

export function googleCallback(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate(
    "google",
    { session: false },
    async (
      err: Error | null,
      user: { id: string; email: string } | false,
      info: { message: string } | undefined,
    ) => {
      if (err) return next(err);
      if (!user) {
        const errorMsg = encodeURIComponent(info?.message || "OAuth failed");
        res.redirect(`${env.CLIENT_URL}/login?error=${errorMsg}`);
        return;
      }

      try {
        const accessToken = generateAccessToken(user.id, user.email);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);
        res.redirect(`${env.CLIENT_URL}/auth/callback`);
      } catch (error) {
        next(error);
      }
    },
  )(req, res, next);
}

// Microsoft OAuth handlers
export function microsoftAuth(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate("microsoft", { scope: ["user.read"], session: false })(req, res, next);
}

export function microsoftCallback(req: Request, res: Response, next: NextFunction): void {
  passport.authenticate(
    "microsoft",
    { session: false },
    async (
      err: Error | null,
      user: { id: string; email: string } | false,
      info: { message: string } | undefined,
    ) => {
      if (err) return next(err);
      if (!user) {
        const errorMsg = encodeURIComponent(info?.message || "OAuth failed");
        res.redirect(`${env.CLIENT_URL}/login?error=${errorMsg}`);
        return;
      }

      try {
        const accessToken = generateAccessToken(user.id, user.email);
        const refreshToken = await generateRefreshToken(user.id);
        setAuthCookies(res, accessToken, refreshToken);
        res.redirect(`${env.CLIENT_URL}/auth/callback`);
      } catch (error) {
        next(error);
      }
    },
  )(req, res, next);
}

export const verifyEmailHandler = asyncHandler(async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    throw new ValidationError("Verification token is required");
  }

  await verifyEmailService(token);
  res.redirect(`${env.CLIENT_URL}/login?verified=true`);
});

export const resendVerificationHandler = asyncHandler(async (req, res) => {
  const userId = (req as AuthenticatedRequest).userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  const token = await resendVerification(userId);
  void sendVerificationEmail({ name: user.name, email: user.email }, token);

  res.json({ success: true, message: "Verification email sent" });
});
