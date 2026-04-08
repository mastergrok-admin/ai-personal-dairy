import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "inv-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app).post("/api/auth/register").send({ name: "Inv Test", email: EMAIL, password: PASSWORD });
  const login = await request(app).post("/api/auth/login").send({ email: EMAIL, password: PASSWORD });
  cookies = [login.headers["set-cookie"]].flat() as string[];
  const mRes = await request(app).post("/api/family-members").set("Cookie", cookies).send({ name: "Self", relationship: "self" });
  memberId = mRes.body.data.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
});

describe("Investments Summary API", () => {
  it("GET /api/investments/summary returns totals across modules", async () => {
    // Seed one of each
    await Promise.all([
      prisma.pPFAccount.create({
        data: { userId: (await prisma.user.findUnique({where:{email:EMAIL}}))!.id, familyMemberId: memberId, bankOrPostOffice: "SBI", openingDate: new Date(), maturityDate: new Date(), currentBalance: 100000 }
      }),
      prisma.goldHolding.create({
        data: { userId: (await prisma.user.findUnique({where:{email:EMAIL}}))!.id, familyMemberId: memberId, description: "Coin", weightGrams: 10, currentPricePerGram: 6000, purity: "k24" }
      })
    ]);

    const res = await request(app).get("/api/investments/summary").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.ppf.balance).toBe(100000);
    expect(res.body.data.gold.currentValue).toBe(60000);
    expect(res.body.data.total.currentValue).toBeGreaterThan(150000);
  });
});
