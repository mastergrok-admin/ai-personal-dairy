import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";
import bcrypt from "bcrypt";

const EMAIL = `fd-test-${Date.now()}@example.com`;
let cookies: string[];
let bankAccountId: string;
let fdId: string;

describe("Fixed Deposits API", () => {
  beforeAll(async () => {
    const role = await prisma.role.upsert({
      where: { name: "User" },
      update: {},
      create: { name: "User", description: "User role", isDefault: true },
    });

    const passwordHash = await bcrypt.hash("TestPass123!", 4);
    const user = await prisma.user.create({
      data: { email: EMAIL, name: "FD Test User", passwordHash, provider: "local" },
    });
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id } });

    const member = await prisma.familyMember.create({
      data: { userId: user.id, name: "Self", relationship: "self" },
    });

    const account = await prisma.bankAccount.create({
      data: {
        userId: user.id,
        familyMemberId: member.id,
        bankName: "State Bank of India",
        accountType: "savings",
        accountNumberLast4: "1234",
        balance: BigInt(5000000),
        balanceUpdatedAt: new Date(),
      },
    });
    bankAccountId = account.id;

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: EMAIL, password: "TestPass123!" });
    cookies = [login.headers["set-cookie"]].flat();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  });

  describe("POST /api/fixed-deposits", () => {
    it("creates an FD and auto-calculates tenure and maturity amount", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .set("Cookie", cookies)
        .send({
          bankAccountId,
          principalAmount: 200000,
          interestRate: 7.1,
          startDate: "2024-01-15",
          maturityDate: "2026-01-15",
          autoRenewal: false,
          status: "active",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankAccountId).toBe(bankAccountId);
      expect(res.body.data.tenureMonths).toBe(24);
      // maturityAmount in paise should be > 20000000 (> ₹2,00,000)
      expect(Number(res.body.data.maturityAmount)).toBeGreaterThan(20000000);
      expect(res.body.data.status).toBe("active");
      fdId = res.body.data.id;
    });

    it("stores optional fdReferenceNumberLast4 and autoRenewal", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .set("Cookie", cookies)
        .send({
          bankAccountId,
          fdReferenceNumberLast4: "4521",
          principalAmount: 100000,
          interestRate: 6.5,
          startDate: "2024-06-01",
          maturityDate: "2025-06-01",
          autoRenewal: true,
          status: "active",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fdReferenceNumberLast4).toBe("4521");
      expect(res.body.data.autoRenewal).toBe(true);
    });

    it("rejects missing bankAccountId", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .set("Cookie", cookies)
        .send({
          principalAmount: 100000,
          interestRate: 7,
          startDate: "2024-01-01",
          maturityDate: "2025-01-01",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects unauthenticated request", async () => {
      const res = await request(app)
        .post("/api/fixed-deposits")
        .send({
          bankAccountId,
          principalAmount: 100000,
          interestRate: 7,
          startDate: "2024-01-01",
          maturityDate: "2025-01-01",
        });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/fixed-deposits", () => {
    it("lists active FDs for a bank account", async () => {
      const res = await request(app)
        .get(`/api/fixed-deposits?bankAccountId=${bankAccountId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it("returns 400 without bankAccountId query param", async () => {
      const res = await request(app)
        .get("/api/fixed-deposits")
        .set("Cookie", cookies);

      expect(res.status).toBe(400);
    });
  });

  describe("PUT /api/fixed-deposits/:id", () => {
    it("updates interest rate and recalculates maturity amount", async () => {
      const res = await request(app)
        .put(`/api/fixed-deposits/${fdId}`)
        .set("Cookie", cookies)
        .send({ interestRate: 7.5 });

      expect(res.status).toBe(200);
      expect(res.body.data.interestRate).toBe(7.5);
      expect(Number(res.body.data.maturityAmount)).toBeGreaterThan(20000000);
    });
  });

  describe("DELETE /api/fixed-deposits/:id", () => {
    it("soft-deletes an FD", async () => {
      const res = await request(app)
        .delete(`/api/fixed-deposits/${fdId}`)
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("deleted FD no longer appears in list", async () => {
      const list = await request(app)
        .get(`/api/fixed-deposits?bankAccountId=${bankAccountId}`)
        .set("Cookie", cookies);
      const ids = list.body.data.map((fd: { id: string }) => fd.id);
      expect(ids).not.toContain(fdId);
    });
  });

  describe("GET /api/bank-accounts (FDs embedded)", () => {
    it("includes fixedDeposits array in each account", async () => {
      const res = await request(app)
        .get("/api/bank-accounts")
        .set("Cookie", cookies);

      expect(res.status).toBe(200);
      const account = res.body.data.find(
        (a: { id: string }) => a.id === bankAccountId
      );
      expect(account).toBeDefined();
      expect(Array.isArray(account.fixedDeposits)).toBe(true);
    });
  });
});
