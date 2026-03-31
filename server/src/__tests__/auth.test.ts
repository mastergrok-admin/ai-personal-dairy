import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const TEST_USER = {
  name: "Test User",
  email: `test-${Date.now()}@example.com`,
  password: "TestPassword123!",
};

describe("Auth API", () => {
  beforeAll(async () => {
    // Ensure default role exists for registration
    await prisma.role.upsert({
      where: { name: "User" },
      update: {},
      create: { name: "User", description: "Test user role", isDefault: true },
    });
  });

  afterAll(async () => {
    // Clean up test user
    await prisma.user.deleteMany({ where: { email: TEST_USER.email } });
    await prisma.$disconnect();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new user", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(TEST_USER);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.user.name).toBe(TEST_USER.name);
      expect(res.body.data.roles).toBeInstanceOf(Array);
      expect(res.body.data.permissions).toBeInstanceOf(Array);
      // Should not expose password hash
      expect(res.body.data.user.passwordHash).toBeUndefined();
      // Should set cookies
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should reject duplicate email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send(TEST_USER);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("already registered");
    });

    it("should reject invalid email", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Bad", email: "not-an-email", password: "12345678" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ name: "Short", email: "short@test.com", password: "123" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should reject missing name", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "noname@test.com", password: "12345678" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should reject wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_USER.email, password: "WrongPassword!" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Invalid");
    });

    it("should reject non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nonexistent@test.com", password: "12345678" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return current user when authenticated", async () => {
      // Login first to get cookies
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const cookies = loginRes.headers["set-cookie"];

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(TEST_USER.email);
      expect(res.body.data.roles).toBeInstanceOf(Array);
      expect(res.body.data.permissions).toBeInstanceOf(Array);
    });

    it("should reject unauthenticated request", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh tokens with valid refresh token", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const cookies = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/refresh")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers["set-cookie"]).toBeDefined();
    });

    it("should reject without refresh token", async () => {
      const res = await request(app).post("/api/auth/refresh");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout and clear cookies", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: TEST_USER.email, password: TEST_USER.password });

      const cookies = loginRes.headers["set-cookie"];

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should reject unauthenticated logout", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(401);
    });
  });
});
