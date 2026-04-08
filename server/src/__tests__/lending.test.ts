import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "lending-test@diary.app";
const PASSWORD = "Test1234!";
let token = "";
let lendingId = "";

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Test", email: EMAIL, password: PASSWORD });
  const res = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  const cookies = res.headers["set-cookie"] as unknown as string[] | undefined;
  token = cookies?.find((c: string) => c.startsWith("access_token"))?.split(";")[0].split("=")[1] ?? "";
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Personal Lending API", () => {
  it("POST /api/lending creates a lending record", async () => {
    const res = await request(app)
      .post("/api/lending")
      .set("Cookie", `access_token=${token}`)
      .send({ direction: "lent", personName: "Ramesh", principalAmount: 10000, date: "2026-01-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("outstanding");
    lendingId = res.body.data.id;
  });

  it("POST /api/lending/:id/repayments records a repayment", async () => {
    const res = await request(app)
      .post(`/api/lending/${lendingId}/repayments`)
      .set("Cookie", `access_token=${token}`)
      .send({ amount: 5000, date: "2026-02-01T00:00:00.000Z" });
    expect(res.status).toBe(201);
    expect(Number(res.body.data.amount)).toBe(500000);
  });

  it("GET /api/lending returns partially_repaid status after partial repayment", async () => {
    const res = await request(app).get("/api/lending").set("Cookie", `access_token=${token}`);
    const record = res.body.data.find((r: any) => r.id === lendingId);
    expect(record.status).toBe("partially_repaid");
    expect(Number(record.outstandingAmount)).toBe(500000);
  });

  it("Full repayment marks lending as settled", async () => {
    await request(app).post(`/api/lending/${lendingId}/repayments`)
      .set("Cookie", `access_token=${token}`)
      .send({ amount: 5000, date: "2026-03-01T00:00:00.000Z" });
    const res = await request(app).get("/api/lending").set("Cookie", `access_token=${token}`);
    const record = res.body.data.find((r: any) => r.id === lendingId);
    expect(record.status).toBe("settled");
  });
});
