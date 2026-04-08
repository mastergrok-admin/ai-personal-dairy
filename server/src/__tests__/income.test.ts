import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "income-test@diary.app";
const PASSWORD = "Test1234!";
let token = "";
let memberId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Test", email: EMAIL, password: PASSWORD });
  const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  token = cookies?.find((c: string) => c.startsWith("access_token"))?.split(";")[0].split("=")[1] ?? "";
  const mRes = await request(app).post("/api/family-members").set("Cookie", `access_token=${token}`).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Income API", () => {
  it("POST /api/income creates an income entry", async () => {
    const res = await request(app)
      .post("/api/income")
      .set("Cookie", `access_token=${token}`)
      .send({ familyMemberId: memberId, source: "salary", amount: 50000, month: 4, year: 2025 });
    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe("salary");
    expect(res.body.data.fiscalYear).toBe("2025-26");
  });

  it("GET /api/income lists entries", async () => {
    const res = await request(app).get("/api/income").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/income/summary returns totals by source", async () => {
    const res = await request(app).get("/api/income/summary?fiscalYear=2025-26").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bySource.salary).toBeGreaterThan(0);
  });

  it("POST /api/income upserts duplicate month+source", async () => {
    await request(app).post("/api/income").set("Cookie", `access_token=${token}`)
      .send({ familyMemberId: memberId, source: "salary", amount: 55000, month: 4, year: 2025 });
    const res = await request(app).get("/api/income?fiscalYear=2025-26").set("Cookie", `access_token=${token}`);
    const salaryEntries = res.body.data.filter((e: any) => e.source === "salary" && e.month === 4 && e.year === 2025);
    expect(salaryEntries.length).toBe(1);
    expect(Number(salaryEntries[0].amount)).toBe(55000 * 100);
  });
});
