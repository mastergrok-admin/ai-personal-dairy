import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "insurance-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let policyId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Insurance Test", email: EMAIL, password: PASSWORD });
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

describe("Insurance API", () => {
  it("POST /api/insurance creates a policy", async () => {
    const res = await request(app)
      .post("/api/insurance")
      .set("Cookie", cookies)
      .send({
        familyMemberId: memberId,
        insuranceType: "term_life",
        insurerName: "HDFC Life",
        sumAssured: 10000000,
        premiumAmount: 12000,
        premiumFrequency: "annual",
        startDate: "2024-01-01T00:00:00.000Z",
        renewalDate: "2025-01-01T00:00:00.000Z",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.insurerName).toBe("HDFC Life");
    expect(typeof res.body.data.daysUntilRenewal).toBe("number");
    expect(typeof res.body.data.renewalSoon).toBe("boolean");
    policyId = res.body.data.id;
  });

  it("GET /api/insurance returns list with computed fields", async () => {
    const res = await request(app).get("/api/insurance").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty("daysUntilRenewal");
    expect(res.body.data[0]).toHaveProperty("renewalSoon");
  });

  it("PUT /api/insurance/:id updates a policy", async () => {
    const res = await request(app)
      .put(`/api/insurance/${policyId}`)
      .set("Cookie", cookies)
      .send({ insurerName: "LIC" });
    expect(res.status).toBe(200);
    expect(res.body.data.insurerName).toBe("LIC");
  });

  it("DELETE /api/insurance/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/insurance/${policyId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/insurance").set("Cookie", cookies);
    expect(list.body.data.find((p: any) => p.id === policyId)).toBeUndefined();
  });
});
