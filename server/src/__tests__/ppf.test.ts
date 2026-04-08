import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "ppf-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let ppfId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "PPF Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("PPF API", () => {
  it("POST /api/ppf creates a PPF account", async () => {
    const res = await request(app)
      .post("/api/ppf")
      .set("Cookie", cookies)
      .send({
        familyMemberId: memberId,
        bankOrPostOffice: "State Bank of India",
        openingDate: "2020-04-01T00:00:00.000Z",
        maturityDate: "2035-04-01T00:00:00.000Z",
        currentBalance: 150000,
        annualContribution: 50000,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.bankOrPostOffice).toBe("State Bank of India");
    expect(res.body.data.currentBalance).toBe(15000000); // 150000 * 100
    ppfId = res.body.data.id;
  });

  it("GET /api/ppf lists accounts", async () => {
    const res = await request(app).get("/api/ppf").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("PUT /api/ppf/:id updates balance", async () => {
    const res = await request(app).put(`/api/ppf/${ppfId}`).set("Cookie", cookies).send({ currentBalance: 200000 });
    expect(res.status).toBe(200);
    expect(res.body.data.currentBalance).toBe(20000000);
  });

  it("DELETE /api/ppf/:id soft deletes", async () => {
    const res = await request(app).delete(`/api/ppf/${ppfId}`).set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/ppf").set("Cookie", cookies);
    expect(list.body.data.find((a: any) => a.id === ppfId)).toBeUndefined();
  });
});
