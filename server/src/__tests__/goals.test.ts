import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "goals-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let goalId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Goals Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Financial Goals API", () => {
  it("POST /api/goals creates a goal", async () => {
    const res = await request(app)
      .post("/api/goals")
      .set("Cookie", cookies)
      .send({
        name: "Buy House",
        category: "home_purchase",
        targetAmount: 5000000,
        targetDate: "2028-01-01T00:00:00.000Z",
        currentAmount: 500000,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe("Buy House");
    expect(typeof res.body.data.progressPercent).toBe("number");
    expect(typeof res.body.data.monthsRemaining).toBe("number");
    expect(typeof res.body.data.requiredMonthlySaving).toBe("number");
    goalId = res.body.data.id;
  });

  it("GET /api/goals lists goals with computed fields", async () => {
    const res = await request(app).get("/api/goals").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("progressPercent");
    expect(res.body.data[0]).toHaveProperty("monthsRemaining");
  });

  it("PUT /api/goals/:id updates currentAmount", async () => {
    const res = await request(app)
      .put(`/api/goals/${goalId}`)
      .set("Cookie", cookies)
      .send({ currentAmount: 1000000 });
    expect(res.status).toBe(200);
    expect(res.body.data.currentAmount).toBe(100000000); // ₹10L in paise
    expect(res.body.data.progressPercent).toBe(20);
  });

  it("DELETE /api/goals/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/goals/${goalId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/goals").set("Cookie", cookies);
    expect(list.body.data.find((g: any) => g.id === goalId)).toBeUndefined();
  });
});
