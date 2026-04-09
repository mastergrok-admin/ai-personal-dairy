import { prisma } from "../models/prisma.js";
import type { VehicleType, FuelType } from "@prisma/client";

function daysUntil(date: Date | null): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

async function resolveLinkedEntities(vehicle: any) {
  const [linkedLoan, linkedInsurance] = await Promise.all([
    vehicle.linkedLoanId
      ? prisma.loan.findUnique({ where: { id: vehicle.linkedLoanId } })
      : Promise.resolve(null),
    vehicle.insurancePolicyId
      ? prisma.insurancePolicy.findUnique({ where: { id: vehicle.insurancePolicyId } })
      : Promise.resolve(null),
  ]);

  const pucDays = daysUntil(vehicle.pucExpiryDate);
  const rcDays = daysUntil(vehicle.rcRenewalDate);

  return {
    ...vehicle,
    pucExpiringSoon: pucDays !== null && pucDays <= 30,
    rcExpiringSoon: rcDays !== null && rcDays <= 30,
    linkedLoan: linkedLoan
      ? {
          lenderName: linkedLoan.lenderName,
          outstandingAmount: Number(linkedLoan.outstandingAmount),
          emiAmount: Number(linkedLoan.emiAmount),
        }
      : null,
    linkedInsurance: linkedInsurance
      ? {
          insurerName: linkedInsurance.insurerName,
          renewalDate: linkedInsurance.renewalDate,
          renewalSoon: (daysUntil(linkedInsurance.renewalDate) ?? Infinity) <= 30,
        }
      : null,
  };
}

export async function listVehicles(userId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId, isActive: true },
    include: { familyMember: { select: { name: true, relationship: true } } },
    orderBy: { createdAt: "desc" },
  });
  return Promise.all(vehicles.map(resolveLinkedEntities));
}

export async function createVehicle(
  userId: string,
  data: {
    familyMemberId: string;
    vehicleType: VehicleType;
    make: string;
    model: string;
    yearOfManufacture: number;
    registrationLast4?: string;
    fuelType: FuelType;
    purchaseDate?: string;
    purchasePrice?: number;
    currentValue?: number;
    linkedLoanId?: string;
    insurancePolicyId?: string;
    pucExpiryDate?: string;
    rcRenewalDate?: string;
    notes?: string;
  }
) {
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      familyMemberId: data.familyMemberId,
      vehicleType: data.vehicleType,
      make: data.make,
      model: data.model,
      yearOfManufacture: data.yearOfManufacture,
      registrationLast4: data.registrationLast4 ?? null,
      fuelType: data.fuelType,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice != null ? BigInt(Math.round(data.purchasePrice * 100)) : null,
      currentValue: data.currentValue != null ? BigInt(Math.round(data.currentValue * 100)) : 0n,
      linkedLoanId: data.linkedLoanId ?? null,
      insurancePolicyId: data.insurancePolicyId ?? null,
      pucExpiryDate: data.pucExpiryDate ? new Date(data.pucExpiryDate) : null,
      rcRenewalDate: data.rcRenewalDate ? new Date(data.rcRenewalDate) : null,
      notes: data.notes ?? null,
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return resolveLinkedEntities(vehicle);
}

export async function updateVehicle(
  id: string,
  userId: string,
  data: {
    make?: string;
    model?: string;
    registrationLast4?: string;
    currentValue?: number;
    linkedLoanId?: string | null;
    insurancePolicyId?: string | null;
    pucExpiryDate?: string | null;
    rcRenewalDate?: string | null;
    notes?: string;
  }
) {
  const vehicle = await prisma.vehicle.update({
    where: { id, userId },
    data: {
      ...(data.make !== undefined && { make: data.make }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.registrationLast4 !== undefined && { registrationLast4: data.registrationLast4 }),
      ...(data.currentValue !== undefined && {
        currentValue: BigInt(Math.round(data.currentValue * 100)),
      }),
      ...(data.linkedLoanId !== undefined && { linkedLoanId: data.linkedLoanId }),
      ...(data.insurancePolicyId !== undefined && { insurancePolicyId: data.insurancePolicyId }),
      ...(data.pucExpiryDate !== undefined && {
        pucExpiryDate: data.pucExpiryDate ? new Date(data.pucExpiryDate) : null,
      }),
      ...(data.rcRenewalDate !== undefined && {
        rcRenewalDate: data.rcRenewalDate ? new Date(data.rcRenewalDate) : null,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: { familyMember: { select: { name: true, relationship: true } } },
  });
  return resolveLinkedEntities(vehicle);
}

export async function deleteVehicle(id: string, userId: string) {
  return prisma.vehicle.update({ where: { id, userId }, data: { isActive: false } });
}

export async function getServiceHistory(vehicleId: string, userId: string) {
  // Verify vehicle belongs to user
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return null;
  return prisma.vehicleService.findMany({
    where: { vehicleId },
    orderBy: { date: "desc" },
  });
}

export async function addService(
  vehicleId: string,
  userId: string,
  data: {
    date: string;
    odometer?: number;
    serviceCentre?: string;
    cost: number;
    description?: string;
  }
) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return null;
  return prisma.vehicleService.create({
    data: {
      vehicleId,
      date: new Date(data.date),
      odometer: data.odometer ?? null,
      serviceCentre: data.serviceCentre ?? null,
      cost: BigInt(Math.round(data.cost * 100)),
      description: data.description ?? null,
    },
  });
}

export async function removeService(serviceId: string, vehicleId: string, userId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, userId } });
  if (!vehicle) return null;
  return prisma.vehicleService.delete({ where: { id: serviceId, vehicleId } });
}
