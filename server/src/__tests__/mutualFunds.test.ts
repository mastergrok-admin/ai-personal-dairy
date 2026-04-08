import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "mf-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let fundId: string;
let txId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "MF Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Mutual Funds API", () => {
  it("POST /api/mutual-funds creates a fund", async () => {
    const res = await request(app)
      .post("/api/mutual-funds")
      .set("Cookie", cookies)
      .send({ familyMemberId: memberId, fundName: "Parag Parikh Flexi Cap", amcName: "PPFAS", schemeType: "equity" });
    expect(res.status).toBe(201);
    expect(res.body.data.fundName).toBe("Parag Parikh Flexi Cap");
    expect(res.body.data.totalUnits).toBe(0);
    fundId = res.body.data.id;
  });

  it("GET /api/mutual-funds lists all funds", async () => {
    const res = await request(app).get("/api/mutual-funds").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("POST /api/mutual-funds/:id/transactions records a SIP", async () => {
    const res = await request(app)
      .post(`/api/mutual-funds/${fundId}/transactions`)
      .set("Cookie", cookies)
      .send({ type: "sip", amount: 5000, units: 100.5, nav: 49.75, date: "2026-01-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.amount)).toBe(500000); // 5000 * 100 paise
    txId = res.body.data.id;
  });

  it("GET /api/mutual-funds returns computed totalUnits and investedPaise", async () => {
    const res = await request(app).get("/api/mutual-funds").set("Cookie", cookies);
    const fund = res.body.data.find((f: any) => f.id === fundId);
    expect(fund.totalUnits).toBeCloseTo(100.5);
    expect(fund.investedPaise).toBe(500000);
  });

  it("DELETE /api/mutual-funds/:id/transactions/:txId removes transaction", async () => {
    const res = await request(app).delete(`/api/mutual-funds/${fundId}/transactions/${txId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("DELETE /api/mutual-funds/:id soft deletes fund", async () => {
    const res = await request(app).delete(`/api/mutual-funds/${fundId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/mutual-funds").set("Cookie", cookies);
    expect(list.body.data.find((f: any) => f.id === fundId)).toBeUndefined();
  });
});
