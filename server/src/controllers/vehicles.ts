import { Request, Response } from "express";
import { z } from "zod";
import * as svc from "../services/vehicles.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import { getParam } from "../utils/params.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const VEHICLE_TYPES = ["car","two_wheeler","commercial","tractor","other"] as const;
const FUEL_TYPES = ["petrol","diesel","cng","electric","hybrid","other"] as const;

const createSchema = z.object({
  familyMemberId: z.string().min(1),
  vehicleType: z.enum(VEHICLE_TYPES),
  make: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  yearOfManufacture: z.number().int().min(1900).max(2100),
  registrationLast4: z.string().length(4).optional(),
  fuelType: z.enum(FUEL_TYPES),
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  linkedLoanId: z.string().optional(),
  insurancePolicyId: z.string().optional(),
  pucExpiryDate: z.string().datetime().optional(),
  rcRenewalDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  make: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  registrationLast4: z.string().length(4).optional(),
  currentValue: z.number().min(0).optional(),
  linkedLoanId: z.string().nullable().optional(),
  insurancePolicyId: z.string().nullable().optional(),
  pucExpiryDate: z.string().datetime().nullable().optional(),
  rcRenewalDate: z.string().datetime().nullable().optional(),
  notes: z.string().max(500).optional(),
});

const serviceSchema = z.object({
  date: z.string().datetime(),
  odometer: z.number().int().min(0).optional(),
  serviceCentre: z.string().max(200).optional(),
  cost: z.number().min(0),
  description: z.string().max(500).optional(),
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await svc.listVehicles((req as AuthenticatedRequest).userId) });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const parsed = createSchema.parse(req.body);
  res.status(201).json({
    success: true,
    data: await svc.createVehicle((req as AuthenticatedRequest).userId, parsed),
  });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateSchema.parse(req.body);
  res.json({
    success: true,
    data: await svc.updateVehicle(
      getParam(req.params.id),
      (req as AuthenticatedRequest).userId,
      parsed
    ),
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await svc.deleteVehicle(getParam(req.params.id), (req as AuthenticatedRequest).userId);
  res.json({ success: true });
});

export const serviceHistory = asyncHandler(async (req: Request, res: Response) => {
  const history = await svc.getServiceHistory(
    getParam(req.params.id),
    (req as AuthenticatedRequest).userId
  );
  if (!history) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
  res.json({ success: true, data: history });
});

export const addService = asyncHandler(async (req: Request, res: Response) => {
  const parsed = serviceSchema.parse(req.body);
  const record = await svc.addService(
    getParam(req.params.id),
    (req as AuthenticatedRequest).userId,
    parsed
  );
  if (!record) { res.status(404).json({ success: false, message: "Vehicle not found" }); return; }
  res.status(201).json({ success: true, data: record });
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const result = await svc.removeService(
    getParam(req.params.serviceId),
    getParam(req.params.id),
    (req as AuthenticatedRequest).userId
  );
  if (!result) { res.status(404).json({ success: false, message: "Service record not found" }); return; }
  res.json({ success: true });
});
