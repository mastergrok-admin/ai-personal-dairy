import { prisma } from "../models/prisma.js";

export async function listUsers(page = 1, limit = 20, search?: string) {
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        roles: { include: { role: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map(({ passwordHash: _passwordHash, ...user }) => ({
      ...user,
      roles: user.roles.map((ur) => ur.role),
    })),
    total,
    page,
    limit,
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
    },
  });

  if (!user) return null;

  const { passwordHash: _passwordHash, ...userData } = user;
  return {
    ...userData,
    roles: user.roles.map((ur) => ur.role),
  };
}

export async function updateUser(
  id: string,
  data: { name?: string; email?: string; isActive?: boolean },
) {
  const user = await prisma.user.update({
    where: { id },
    data,
    include: { roles: { include: { role: true } } },
  });

  const { passwordHash: _passwordHash, ...userData } = user;
  return {
    ...userData,
    roles: user.roles.map((ur) => ur.role),
  };
}

export async function deactivateUser(id: string) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function assignRoles(userId: string, roleIds: string[]) {
  await prisma.userRole.deleteMany({ where: { userId } });

  if (roleIds.length > 0) {
    await prisma.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
  }

  return getUserById(userId);
}
