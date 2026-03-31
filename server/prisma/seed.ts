import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { name: "diary.create", description: "Create diary entries", module: "diary" },
  { name: "diary.read", description: "Read own diary entries", module: "diary" },
  { name: "diary.update", description: "Update own diary entries", module: "diary" },
  { name: "diary.delete", description: "Delete own diary entries", module: "diary" },
  { name: "diary.read_shared", description: "Read entries shared by family", module: "diary" },
  { name: "user.create", description: "Create users", module: "user" },
  { name: "user.read", description: "View user list", module: "user" },
  { name: "user.update", description: "Edit users and assign roles", module: "user" },
  { name: "user.delete", description: "Deactivate users", module: "user" },
  { name: "role.create", description: "Create roles", module: "role" },
  { name: "role.read", description: "View roles", module: "role" },
  { name: "role.update", description: "Edit roles and assign permissions", module: "role" },
  { name: "role.delete", description: "Delete roles", module: "role" },
  { name: "permission.create", description: "Create permissions", module: "permission" },
  { name: "permission.read", description: "View permissions", module: "permission" },
  { name: "permission.update", description: "Edit permissions", module: "permission" },
  { name: "permission.delete", description: "Delete permissions", module: "permission" },
  { name: "finance.create", description: "Create financial records", module: "finance" },
  { name: "finance.read", description: "View financial data", module: "finance" },
  { name: "finance.update", description: "Edit financial records", module: "finance" },
  { name: "finance.delete", description: "Delete financial records", module: "finance" },
  { name: "family.invite", description: "Invite family members", module: "family" },
  { name: "admin.dashboard", description: "Access admin dashboard/analytics", module: "admin" },
  { name: "admin.settings.read", description: "View app settings", module: "admin" },
  { name: "admin.settings.update", description: "Update app settings", module: "admin" },
  { name: "invite.create", description: "Create invites", module: "invite" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: PERMISSIONS.map((p) => p.name),
  User: [
    "diary.create", "diary.read", "diary.update", "diary.delete",
    "diary.read_shared", "family.invite", "invite.create",
  ],
  Financer: [
    "finance.create", "finance.read", "finance.update", "finance.delete",
  ],
  Family: ["diary.read_shared"],
};

async function main() {
  console.log("Seeding database...");

  // Create permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description, module: perm.module },
      create: perm,
    });
  }
  console.log(`Created/updated ${PERMISSIONS.length} permissions`);

  // Create roles
  const roles = [
    { name: "Admin", description: "Full system access", isDefault: false },
    { name: "User", description: "Standard diary user", isDefault: true },
    { name: "Financer", description: "Financial data manager", isDefault: false },
    { name: "Family", description: "Family member with shared access", isDefault: false },
  ];

  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description, isDefault: roleData.isDefault },
      create: roleData,
    });

    // Assign permissions
    const permNames = ROLE_PERMISSIONS[role.name] || [];
    const perms = await prisma.permission.findMany({
      where: { name: { in: permNames } },
    });

    // Clear existing and re-assign
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });

    console.log(`Role "${role.name}" → ${perms.length} permissions`);
  }

  // Create admin user if none exists
  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });
  if (!adminRole) {
    console.log("Admin role not found, skipping admin user creation");
    return;
  }

  const existingAdmin = await prisma.userRole.findFirst({
    where: { roleId: adminRole.id },
  });

  if (!existingAdmin) {
    const password = process.env.ADMIN_SEED_PASSWORD || "Admin@123456";
    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
      data: {
        email: "admin@diary.app",
        name: "Admin",
        passwordHash,
        provider: "local",
      },
    });

    await prisma.userRole.create({
      data: { userId: admin.id, roleId: adminRole.id },
    });

    console.log(`Created admin user: admin@diary.app`);
  } else {
    console.log("Admin user already exists, skipping");
  }

  // Seed default app settings
  await prisma.appSetting.upsert({
    where: { key: "userInvitesEnabled" },
    update: {},
    create: { key: "userInvitesEnabled", value: "false" },
  });
  console.log("App settings seeded");

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
