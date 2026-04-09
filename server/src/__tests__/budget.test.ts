import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "budget-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let budgetId: string;
let memberId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Budget Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
  const mRes = await request(app)
    .post("/api/family-members")
    .set("Cookie", cookies)
    .send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Budget API", () => {
  it("GET /api/budget returns 404 when no budget set", async () => {
    const res = await request(app)
      .get("/api/budget?month=1&year=2026")
      .set("Cookie", cookies);
    expect(res.status).toBe(404);
  });

  it("POST /api/budget creates a budget with items", async () => {
    const res = await request(app)
      .post("/api/budget")
      .set("Cookie", cookies)
      .send({
        month: 4,
        year: 2026,
        items: [
          { category: "groceries", budgetAmount: 10000 },
          { category: "fuel", budgetAmount: 5000 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.month).toBe(4);
    expect(res.body.data.items.length).toBe(2);
    budgetId = res.body.data.id;
  });

  it("GET /api/budget returns the budget", async () => {
    const res = await request(app)
      .get("/api/budget?month=4&year=2026")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(budgetId);
  });

  it("PUT /api/budget/:id replaces items", async () => {
    const res = await request(app)
      .put(`/api/budget/${budgetId}`)
      .set("Cookie", cookies)
      .send({
        items: [{ category: "medical", budgetAmount: 8000 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].category).toBe("medical");
  });

  it("GET /api/budget/vs-actual returns comparison structure", async () => {
    // Seed an expense for the same month
    const user = await prisma.user.findUnique({ where: { email: EMAIL } });
    await prisma.expense.create({
      data: {
        userId: user!.id,
        familyMemberId: memberId,
        category: "medical",
        amount: 500000n, // ₹5000 in paise
        date: new Date("2026-04-15"),
      },
    });

    const res = await request(app)
      .get("/api/budget/vs-actual?month=4&year=2026")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("totalBudget");
    expect(res.body.data).toHaveProperty("totalActual");
    expect(res.body.data).toHaveProperty("items");
    expect(res.body.data).toHaveProperty("savingsRate");
    const medicalItem = res.body.data.items.find((i: any) => i.category === "medical");
    expect(medicalItem.actual).toBe(500000);
    expect(medicalItem.budgeted).toBe(800000); // ₹8000 in paise
  });

  it("POST /api/budget with copyFromMonth copies items", async () => {
    const res = await request(app)
      .post("/api/budget")
      .set("Cookie", cookies)
      .send({
        month: 5,
        year: 2026,
        copyFromMonth: 4,
        copyFromYear: 2026,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.items[0].category).toBe("medical");
  });
});
