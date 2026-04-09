import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "tax-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let deductionId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Tax Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Tax API", () => {
  it("GET /api/tax/summary returns full summary structure", async () => {
    const res = await request(app)
      .get("/api/tax/summary?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d).toHaveProperty("fiscalYear", "2025-26");
    expect(d).toHaveProperty("income");
    expect(d).toHaveProperty("deductions");
    expect(d).toHaveProperty("taxableIncome");
    expect(d).toHaveProperty("taxLiability");
    expect(d).toHaveProperty("advanceTax");
    expect(d).toHaveProperty("form15GH");
    expect(d.advanceTax.q1_by).toBe("2025-06-15");
    expect(d.advanceTax.q4_by).toBe("2026-03-15");
  });

  it("PUT /api/tax/profile updates preferred regime", async () => {
    const res = await request(app)
      .put("/api/tax/profile")
      .set("Cookie", cookies)
      .send({ fiscalYear: "2025-26", preferredRegime: "old" });
    expect(res.status).toBe(200);
    expect(res.body.data.preferredRegime).toBe("old");
  });

  it("POST /api/tax/deductions adds a manual deduction", async () => {
    const res = await request(app)
      .post("/api/tax/deductions")
      .set("Cookie", cookies)
      .send({
        fiscalYear: "2025-26",
        section: "sec80C_nsc",
        amount: 50000,
        description: "NSC purchased",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.section).toBe("sec80C_nsc");
    deductionId = res.body.data.id;
  });

  it("GET /api/tax/deductions?fiscalYear=2025-26 returns deductions", async () => {
    const res = await request(app)
      .get("/api/tax/deductions?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("PUT /api/tax/deductions/:id updates a deduction", async () => {
    const res = await request(app)
      .put(`/api/tax/deductions/${deductionId}`)
      .set("Cookie", cookies)
      .send({ amount: 60000 });
    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(6000000); // ₹60,000 in paise
  });

  it("DELETE /api/tax/deductions/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/tax/deductions/${deductionId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app)
      .get("/api/tax/deductions?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(list.body.data.find((d: any) => d.id === deductionId)).toBeUndefined();
  });
});
