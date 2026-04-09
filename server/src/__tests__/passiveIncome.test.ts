import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "passive-income-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let entryId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "PI Test", email: EMAIL, password: PASSWORD });
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Passive Income API", () => {
  it("POST /api/passive-income creates an entry", async () => {
    const res = await request(app)
      .post("/api/passive-income")
      .set("Cookie", cookies)
      .send({
        incomeType: "dividend_stock",
        amount: 5000,
        date: "2025-07-15T00:00:00.000Z",
        source: "TCS",
        tdsDeducted: 500,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.source).toBe("TCS");
    entryId = res.body.data.id;
  });

  it("GET /api/passive-income?fiscalYear=2025-26 filters by FY", async () => {
    const res = await request(app)
      .get("/api/passive-income?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("GET /api/passive-income/summary?fiscalYear=2025-26 returns totals", async () => {
    const res = await request(app)
      .get("/api/passive-income/summary?fiscalYear=2025-26")
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.totalAmount).toBe(500000); // ₹5000 in paise
    expect(res.body.data.totalTdsDeducted).toBe(50000); // ₹500 in paise
    expect(res.body.data.byType[0].type).toBe("dividend_stock");
  });

  it("PUT /api/passive-income/:id updates entry", async () => {
    const res = await request(app)
      .put(`/api/passive-income/${entryId}`)
      .set("Cookie", cookies)
      .send({ source: "Infosys" });
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe("Infosys");
  });

  it("DELETE /api/passive-income/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/passive-income/${entryId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app)
      .get("/api/passive-income")
      .set("Cookie", cookies);
    expect(list.body.data.find((e: any) => e.id === entryId)).toBeUndefined();
  });
});
