import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "expense-test@diary.app";
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

describe("Expenses API", () => {
  it("POST /api/expenses creates an expense", async () => {
    const res = await request(app)
      .post("/api/expenses")
      .set("Cookie", `access_token=${token}`)
      .send({ familyMemberId: memberId, category: "groceries", amount: 1500, date: "2026-03-15T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe("groceries");
    expect(Number(res.body.data.amount)).toBe(150000);
  });

  it("GET /api/expenses?month=3&year=2026 filters by month", async () => {
    const res = await request(app).get("/api/expenses?month=3&year=2026").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/expenses/summary returns category totals", async () => {
    const res = await request(app).get("/api/expenses/summary?month=3&year=2026").set("Cookie", `access_token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.byCategory.groceries).toBeGreaterThan(0);
  });
});
