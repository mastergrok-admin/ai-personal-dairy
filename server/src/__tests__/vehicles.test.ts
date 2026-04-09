import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import { prisma } from "../models/prisma.js";

const EMAIL = "vehicles-test@diary.app";
const PASSWORD = "Test1234!";
let cookies: string[];
let memberId: string;
let vehicleId: string;
let serviceId: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await request(app)
    .post("/api/auth/register")
    .send({ name: "Vehicle Test", email: EMAIL, password: PASSWORD });
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

describe("Vehicles API", () => {
  it("POST /api/vehicles creates a vehicle", async () => {
    const res = await request(app)
      .post("/api/vehicles")
      .set("Cookie", cookies)
      .send({
        familyMemberId: memberId,
        vehicleType: "car",
        make: "Maruti Suzuki",
        model: "Swift",
        yearOfManufacture: 2022,
        fuelType: "petrol",
        currentValue: 750000,
        pucExpiryDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      });
    expect(res.status).toBe(201);
    expect(res.body.data.make).toBe("Maruti Suzuki");
    expect(res.body.data.pucExpiringSoon).toBe(true);   // < 30 days
    expect(res.body.data.linkedLoan).toBeNull();
    vehicleId = res.body.data.id;
  });

  it("GET /api/vehicles lists vehicles with computed flags", async () => {
    const res = await request(app).get("/api/vehicles").set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0]).toHaveProperty("pucExpiringSoon");
    expect(res.body.data[0]).toHaveProperty("rcExpiringSoon");
  });

  it("PUT /api/vehicles/:id updates vehicle", async () => {
    const res = await request(app)
      .put(`/api/vehicles/${vehicleId}`)
      .set("Cookie", cookies)
      .send({ currentValue: 700000 });
    expect(res.status).toBe(200);
    expect(res.body.data.currentValue).toBe(70000000); // paise
  });

  it("POST /api/vehicles/:id/service adds a service record", async () => {
    const res = await request(app)
      .post(`/api/vehicles/${vehicleId}/service`)
      .set("Cookie", cookies)
      .send({
        date: "2026-03-01T00:00:00.000Z",
        odometer: 15000,
        serviceCentre: "Maruti Authorized",
        cost: 8500,
        description: "Full service",
      });
    expect(res.status).toBe(201);
    expect(res.body.data.odometer).toBe(15000);
    serviceId = res.body.data.id;
  });

  it("GET /api/vehicles/:id/service returns service history", async () => {
    const res = await request(app)
      .get(`/api/vehicles/${vehicleId}/service`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
  });

  it("DELETE /api/vehicles/:id/service/:serviceId removes record", async () => {
    const res = await request(app)
      .delete(`/api/vehicles/${vehicleId}/service/${serviceId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const history = await request(app)
      .get(`/api/vehicles/${vehicleId}/service`)
      .set("Cookie", cookies);
    expect(history.body.data.length).toBe(0);
  });

  it("DELETE /api/vehicles/:id soft-deletes", async () => {
    const res = await request(app)
      .delete(`/api/vehicles/${vehicleId}`)
      .set("Cookie", cookies);
    expect(res.status).toBe(200);
    const list = await request(app).get("/api/vehicles").set("Cookie", cookies);
    expect(list.body.data.find((v: any) => v.id === vehicleId)).toBeUndefined();
  });
});
