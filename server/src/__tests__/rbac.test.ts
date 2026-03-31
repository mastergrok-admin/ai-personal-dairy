import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";
import bcrypt from "bcrypt";

let adminCookies: string[];
let userCookies: string[];

const ADMIN_EMAIL = `admin-test-${Date.now()}@example.com`;
const USER_EMAIL = `user-test-${Date.now()}@example.com`;

describe("RBAC API", () => {
  beforeAll(async () => {
    // Ensure roles and permissions exist
    const adminRole = await prisma.role.upsert({
      where: { name: "Admin" },
      update: {},
      create: { name: "Admin", description: "Admin role" },
    });

    const userRole = await prisma.role.upsert({
      where: { name: "User" },
      update: {},
      create: { name: "User", description: "User role", isDefault: true },
    });

    // Create all required permissions
    const permNames = [
      "user.read", "user.create", "user.update", "user.delete",
      "role.read", "role.create", "role.update", "role.delete",
      "permission.read", "permission.create", "permission.update", "permission.delete",
    ];

    for (const name of permNames) {
      const perm = await prisma.permission.upsert({
        where: { name },
        update: {},
        create: { name, module: name.split(".")[0], description: `Test ${name}` },
      });
      // Assign all permissions to admin
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: perm.id },
      });
    }

    const passwordHash = await bcrypt.hash("TestPass123!", 4); // Low rounds for speed

    // Create admin test user
    const admin = await prisma.user.create({
      data: { email: ADMIN_EMAIL, name: "Admin Test", passwordHash, provider: "local" },
    });
    await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });

    // Create regular test user
    const user = await prisma.user.create({
      data: { email: USER_EMAIL, name: "User Test", passwordHash, provider: "local" },
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: userRole.id } });

    // Login both
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "TestPass123!" });
    adminCookies = adminLogin.headers["set-cookie"];

    const userLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: "TestPass123!" });
    userCookies = userLogin.headers["set-cookie"];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [ADMIN_EMAIL, USER_EMAIL] } },
    });
    await prisma.$disconnect();
  });

  // --- User Management ---

  describe("GET /api/users", () => {
    it("should allow admin to list users", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it("should deny regular user", async () => {
      const res = await request(app)
        .get("/api/users")
        .set("Cookie", userCookies);

      expect(res.status).toBe(403);
      expect(res.body.error).toContain("Insufficient permissions");
    });

    it("should deny unauthenticated request", async () => {
      const res = await request(app).get("/api/users");

      expect(res.status).toBe(401);
    });

    it("should support search query", async () => {
      const res = await request(app)
        .get("/api/users?search=Admin")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThan(0);
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/users?page=1&limit=5")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(5);
    });
  });

  describe("GET /api/users/:id", () => {
    it("should return user details with roles", async () => {
      const listRes = await request(app)
        .get("/api/users")
        .set("Cookie", adminCookies);

      const userId = listRes.body.users[0].id;
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.roles).toBeInstanceOf(Array);
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app)
        .get("/api/users/nonexistent-id")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(404);
    });
  });

  // --- Role Management ---

  describe("GET /api/roles", () => {
    it("should allow admin to list roles", async () => {
      const res = await request(app)
        .get("/api/roles")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("should deny regular user", async () => {
      const res = await request(app)
        .get("/api/roles")
        .set("Cookie", userCookies);

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/roles", () => {
    it("should allow admin to create a role", async () => {
      const res = await request(app)
        .post("/api/roles")
        .set("Cookie", adminCookies)
        .send({ name: `TestRole-${Date.now()}`, description: "A test role" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toContain("TestRole");

      // Cleanup
      await prisma.role.delete({ where: { id: res.body.data.id } });
    });

    it("should reject role with empty name", async () => {
      const res = await request(app)
        .post("/api/roles")
        .set("Cookie", adminCookies)
        .send({ name: "", description: "No name" });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/roles/:id", () => {
    it("should delete role with no users", async () => {
      const createRes = await request(app)
        .post("/api/roles")
        .set("Cookie", adminCookies)
        .send({ name: `DeleteMe-${Date.now()}` });

      const roleId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/roles/${roleId}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should block deleting role with assigned users", async () => {
      // Admin role has users assigned
      const rolesRes = await request(app)
        .get("/api/roles")
        .set("Cookie", adminCookies);

      const adminRole = rolesRes.body.data.find((r: { name: string }) => r.name === "Admin");
      if (adminRole) {
        const res = await request(app)
          .delete(`/api/roles/${adminRole.id}`)
          .set("Cookie", adminCookies);

        expect(res.status).toBe(400);
        expect(res.body.error).toContain("Cannot delete");
      }
    });
  });

  // --- Permission Management ---

  describe("GET /api/permissions", () => {
    it("should allow admin to list permissions grouped by module", async () => {
      const res = await request(app)
        .get("/api/permissions")
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.data.permissions).toBeInstanceOf(Array);
      expect(res.body.data.grouped).toBeDefined();
      expect(typeof res.body.data.grouped).toBe("object");
    });

    it("should deny regular user", async () => {
      const res = await request(app)
        .get("/api/permissions")
        .set("Cookie", userCookies);

      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/permissions", () => {
    it("should allow admin to create a permission", async () => {
      const permName = `test.perm-${Date.now()}`;
      const res = await request(app)
        .post("/api/permissions")
        .set("Cookie", adminCookies)
        .send({ name: permName, module: "test", description: "Test perm" });

      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe(permName);

      // Cleanup
      await prisma.permission.delete({ where: { id: res.body.data.id } });
    });
  });

  describe("DELETE /api/permissions/:id", () => {
    it("should delete permission not assigned to roles", async () => {
      const perm = await prisma.permission.create({
        data: { name: `deletable-${Date.now()}`, module: "test" },
      });

      const res = await request(app)
        .delete(`/api/permissions/${perm.id}`)
        .set("Cookie", adminCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should block deleting permission assigned to roles", async () => {
      // user.read is assigned to Admin role
      const perm = await prisma.permission.findUnique({ where: { name: "user.read" } });
      if (perm) {
        const res = await request(app)
          .delete(`/api/permissions/${perm.id}`)
          .set("Cookie", adminCookies);

        expect(res.status).toBe(400);
        expect(res.body.error).toContain("Cannot delete");
      }
    });
  });

  // --- Role Permission Assignment ---

  describe("PUT /api/roles/:id/permissions", () => {
    it("should allow admin to set role permissions", async () => {
      const createRes = await request(app)
        .post("/api/roles")
        .set("Cookie", adminCookies)
        .send({ name: `PermTest-${Date.now()}` });

      const roleId = createRes.body.data.id;
      const perm = await prisma.permission.findFirst();

      const res = await request(app)
        .put(`/api/roles/${roleId}/permissions`)
        .set("Cookie", adminCookies)
        .send({ permissionIds: perm ? [perm.id] : [] });

      expect(res.status).toBe(200);
      expect(res.body.data.permissions.length).toBe(perm ? 1 : 0);

      // Cleanup
      await prisma.role.delete({ where: { id: roleId } });
    });
  });

  // --- User Role Assignment ---

  describe("PUT /api/users/:id/roles", () => {
    it("should allow admin to assign roles to user", async () => {
      const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
      const roles = await prisma.role.findMany({ take: 2 });

      const res = await request(app)
        .put(`/api/users/${user!.id}/roles`)
        .set("Cookie", adminCookies)
        .send({ roleIds: roles.map((r) => r.id) });

      expect(res.status).toBe(200);
      expect(res.body.data.roles.length).toBe(roles.length);
    });
  });
});
