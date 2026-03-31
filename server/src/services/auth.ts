import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { Response } from "express";
import { prisma } from "../models/prisma.js";
import { env } from "../config/env.js";

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as string & jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(
  token: string,
): { userId: string; email: string } {
  return jwt.verify(token, env.JWT_SECRET) as {
    userId: string;
    email: string;
  };
}

export async function generateRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");

  const expiresAt = new Date();
  const days = parseInt(env.JWT_REFRESH_EXPIRY) || 7;
  expiresAt.setDate(expiresAt.getDate() + days);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return token;
}

export async function rotateRefreshToken(
  oldToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const existing = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  });

  if (!existing || existing.expiresAt < new Date()) {
    if (existing) {
      await prisma.refreshToken.delete({ where: { id: existing.id } });
    }
    return null;
  }

  await prisma.refreshToken.delete({ where: { id: existing.id } });

  const accessToken = generateAccessToken(
    existing.user.id,
    existing.user.email,
  );
  const refreshToken = await generateRefreshToken(existing.user.id);

  return { accessToken, refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken
    .delete({ where: { token } })
    .catch(() => {});
}

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  const isProduction = env.NODE_ENV === "production";

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000, // 15 minutes
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/api/auth" });
}

export async function getUserWithRolesAndPermissions(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  const roles = user.roles.map((ur) => ur.role);
  const permissions = [
    ...new Set(
      roles.flatMap((r) => r.permissions.map((rp) => rp.permission.name)),
    ),
  ];

  const { passwordHash: _passwordHash, roles: _roles, ...userData } = user;

  return {
    user: userData,
    roles: roles.map(({ permissions: _p, ...role }) => role),
    permissions,
  };
}

export async function assignDefaultRole(userId: string): Promise<void> {
  const defaultRole = await prisma.role.findFirst({
    where: { isDefault: true },
  });

  if (defaultRole) {
    await prisma.userRole.create({
      data: { userId, roleId: defaultRole.id },
    });
  }
}
