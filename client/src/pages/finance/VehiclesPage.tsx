import { useState, useEffect } from "react";
import { Car, Plus, Edit2, Trash2, AlertTriangle, Calendar, Tool, Link as LinkIcon, History } from "lucide-react";
import type {
  VehicleResponse,
  VehicleType,
  FuelType,
  Relationship,
  VehicleServiceResponse,
} from "@diary/shared";
import {
  VEHICLE_TYPE_LABELS,
  FUEL_TYPE_LABELS,
} from "@diary/shared";

interface FamilyMember { id: string; name: string; relationship: Relationship }

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

const VEHICLE_TYPE_VALUES: VehicleType[] = ["car","two_wheeler","commercial","tractor","other"];
const FUEL_TYPE_VALUES: FuelType[] = ["petrol","diesel","cng","electric","hybrid","other"];

const emptyForm = {
  familyMemberId: "",
  vehicleType: "car" as VehicleType,
  make: "",
  model: "",
  yearOfManufacture: new Date().getFullYear(),
  registrationLast4: "",
  fuelType: "petrol" as FuelType,
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  linkedLoanId: "",
  insurancePolicyId: "",
  pucExpiryDate: "",
  rcRenewalDate: "",
  notes: "",
};

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<VehicleResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Service history state
  const [historyVehicle, setHistoryVehicle] = useState<VehicleResponse | null>(null);
  const [history, setHistory] = useState<VehicleServiceResponse[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [srvDate, setSrvDate] = useState("");
  const [srvCost, setSrvCost] = useState("");
  const [srvOdo, setSrvOdo] = useState("");
  const [srvCentre, setSrvCentre] = useState("");
  const [srvDesc, setSrvDesc] = useState("");

  async function load() {
    setLoading(true);
    const [vehRes, memRes] = await Promise.all([
      fetch(`${API}/api/vehicles`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/family-members`, { credentials: "include" }).then((r) => r.json()),
    ]);
    if (vehRes.success) setVehicles(vehRes.data);
    if (memRes.success) setMembers(memRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, familyMemberId: members[0]?.id ?? "" });
    setShowModal(true);
  }

  function openEdit(v: VehicleResponse) {
    setEditing(v);
    setForm({
      familyMemberId: v.familyMemberId,
      vehicleType: v.vehicleType,
      make: v.make,
      model: v.model,
      yearOfManufacture: v.yearOfManufacture,
      registrationLast4: v.registrationLast4 ?? "",
      fuelType: v.fuelType,
      purchaseDate: v.purchaseDate?.slice(0, 10) ?? "",
      purchasePrice: v.purchasePrice ? String(v.purchasePrice / 100) : "",
      currentValue: String(v.currentValue / 100),
      linkedLoanId: v.linkedLoanId ?? "",
      insurancePolicyId: v.insurancePolicyId ?? "",
      pucExpiryDate: v.pucExpiryDate?.slice(0, 10) ?? "",
      rcRenewalDate: v.rcRenewalDate?.slice(0, 10) ?? "",
      notes: v.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      purchasePrice: form.purchasePrice ? parseFloat(form.purchasePrice) : undefined,
      currentValue: parseFloat(form.currentValue) || 0,
      purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
      pucExpiryDate: form.pucExpiryDate ? new Date(form.pucExpiryDate).toISOString() : null,
      rcRenewalDate: form.rcRenewalDate ? new Date(form.rcRenewalDate).toISOString() : null,
      registrationLast4: form.registrationLast4 || undefined,
      linkedLoanId: form.linkedLoanId || null,
      insurancePolicyId: form.insurancePolicyId || null,
      notes: form.notes || undefined,
    };
    const url = editing ? `${API}/api/vehicles/${editing.id}` : `${API}/api/vehicles`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if ((await res.json()).success) {
      load();
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vehicle?")) return;
    const res = await fetch(`${API}/api/vehicles/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) {
      setVehicles((prev) => prev.filter((v) => v.id !== id));
    }
  }

  // --- Service History Handlers ---
  async function openHistory(v: VehicleResponse) {
    setHistoryVehicle(v);
    setLoadingHistory(true);
    const res = await fetch(`${API}/api/vehicles/${v.id}/service`, { credentials: "include" });
    const data = await res.json();
    if (data.success) setHistory(data.data);
    setLoadingHistory(false);
  }

  async function handleAddService() {
    if (!historyVehicle) return;
    setSaving(true);
    const res = await fetch(`${API}/api/vehicles/${historyVehicle.id}/service`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date(srvDate).toISOString(),
        cost: parseFloat(srvCost),
        odometer: srvOdo ? parseInt(srvOdo, 10) : undefined,
        serviceCentre: srvCentre || undefined,
        description: srvDesc || undefined,
      }),
    });
    if ((await res.json()).success) {
      openHistory(historyVehicle);
      setShowServiceForm(false);
      setSrvDate(""); setSrvCost(""); setSrvOdo(""); setSrvCentre(""); setSrvDesc("");
    }
    setSaving(false);
  }

  async function handleDeleteService(sid: string) {
    if (!historyVehicle || !confirm("Remove this service record?")) return;
    const res = await fetch(`${API}/api/vehicles/${historyVehicle.id}/service/${sid}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) openHistory(historyVehicle);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Vehicles</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Vehicle
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No vehicles tracked yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              onEdit={() => openEdit(v)}
              onDelete={() => handleDelete(v.id)}
              onHistory={() => openHistory(v)}
            />
          ))}
        </div>
      )}

      {/* Vehicle Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Vehicle" : "Add Vehicle"}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Owner (Family Member)</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.familyMemberId}
                    onChange={(e) => setForm({ ...form, familyMemberId: e.target.value })}
                  >
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Vehicle Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.vehicleType}
                    onChange={(e) => setForm({ ...form, vehicleType: e.target.value as VehicleType })}
                  >
                    {VEHICLE_TYPE_VALUES.map((v) => <option key={v} value={v}>{VEHICLE_TYPE_LABELS[v]}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Make</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.make}
                    onChange={(e) => setForm({ ...form, make: e.target.value })}
                    placeholder="e.g. Maruti Suzuki"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Model</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="e.g. Swift"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Year of Manufacture</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.yearOfManufacture}
                    onChange={(e) => setForm({ ...form, yearOfManufacture: parseInt(e.target.value, 10) })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Reg. Last 4 Digits</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.registrationLast4}
                    maxLength={4}
                    onChange={(e) => setForm({ ...form, registrationLast4: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Fuel Type</label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.fuelType}
                    onChange={(e) => setForm({ ...form, fuelType: e.target.value as FuelType })}
                  >
                    {FUEL_TYPE_VALUES.map((v) => <option key={v} value={v}>{FUEL_TYPE_LABELS[v]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Current Value (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.currentValue}
                    onChange={(e) => setForm({ ...form, currentValue: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">PUC Expiry</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.pucExpiryDate}
                    onChange={(e) => setForm({ ...form, pucExpiryDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">RC Renewal Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.rcRenewalDate}
                    onChange={(e) => setForm({ ...form, rcRenewalDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service History Modal */}
      {historyVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Service History — {historyVehicle.make} {historyVehicle.model}
              </h2>
              <button
                onClick={() => setHistoryVehicle(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900 dark:text-white">Add Service Record</h3>
                <button
                  onClick={() => setShowServiceForm(!showServiceForm)}
                  className="text-xs font-medium text-ocean-accent"
                >
                  {showServiceForm ? "Cancel" : "+ Add New"}
                </button>
              </div>
              {showServiceForm && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input type="date" className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700" value={srvDate} onChange={(e)=>setSrvDate(e.target.value)} />
                  <input type="number" placeholder="Cost (₹)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700" value={srvCost} onChange={(e)=>setSrvCost(e.target.value)} />
                  <input type="number" placeholder="Odometer (km)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700" value={srvOdo} onChange={(e)=>setSrvOdo(e.target.value)} />
                  <input type="text" placeholder="Service Centre" className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700" value={srvCentre} onChange={(e)=>setSrvCentre(e.target.value)} />
                  <input type="text" placeholder="Description" className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:bg-slate-700" value={srvDesc} onChange={(e)=>setSrvDesc(e.target.value)} />
                  <button onClick={handleAddService} disabled={saving} className="sm:col-span-2 rounded-lg bg-ocean-accent py-2 text-sm font-medium text-white">Save Record</button>
                </div>
              )}
            </div>

            {loadingHistory ? (
              <p className="text-center text-slate-500">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-center text-slate-500 italic">No service records found.</p>
            ) : (
              <div className="space-y-3">
                {history.map((s) => (
                  <div key={s.id} className="flex items-start justify-between rounded-xl border border-slate-100 p-3 dark:border-slate-700">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{rupees(s.cost)}</span>
                        <span className="text-xs text-slate-500">• {new Date(s.date).toLocaleDateString("en-IN")}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{s.description || "General Service"}</p>
                      <p className="text-xs text-slate-500">
                        {s.serviceCentre && `At ${s.serviceCentre}`}
                        {s.odometer && ` • ${s.odometer.toLocaleString()} km`}
                      </p>
                    </div>
                    <button onClick={() => handleDeleteService(s.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleCard({ vehicle, onEdit, onDelete, onHistory }: { vehicle: VehicleResponse; onEdit: () => void; onDelete: () => void; onHistory: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white">
            {vehicle.make} {vehicle.model}
            {vehicle.registrationLast4 && <span className="ml-2 text-xs font-normal text-slate-400">• {vehicle.registrationLast4}</span>}
          </h3>
          <p className="text-xs text-slate-500">
            {vehicle.yearOfManufacture} • {VEHICLE_TYPE_LABELS[vehicle.vehicleType]} • {FUEL_TYPE_LABELS[vehicle.fuelType]}
          </p>
        </div>
        <div className="flex gap-1">
          <button onClick={onHistory} title="Service History" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><History className="h-4 w-4" /></button>
          <button onClick={onEdit} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><Edit2 className="h-4 w-4" /></button>
          <button onClick={onDelete} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-700/50">
          <span className="text-slate-500 block mb-0.5">Value</span>
          <span className="font-semibold text-slate-900 dark:text-white">{rupees(vehicle.currentValue)}</span>
        </div>
        {vehicle.linkedLoan && (
          <div className="rounded-lg bg-red-50 p-2 dark:bg-red-900/10">
            <span className="text-red-600/70 block mb-0.5 flex items-center gap-1"><LinkIcon className="h-3 w-3"/> Loan</span>
            <span className="font-semibold text-red-700 dark:text-red-400">{rupees(vehicle.linkedLoan.outstandingAmount)}</span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {vehicle.pucExpiryDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <ShieldCheckIcon className="h-3.5 w-3.5" /> PUC Expiry
            </span>
            <span className={`font-medium ${vehicle.pucExpiringSoon ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>
              {new Date(vehicle.pucExpiryDate).toLocaleDateString("en-IN")}
              {vehicle.pucExpiringSoon && <AlertTriangle className="ml-1 inline h-3 w-3" />}
            </span>
          </div>
        )}
        {vehicle.rcRenewalDate && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Calendar className="h-3.5 w-3.5" /> RC Renewal
            </span>
            <span className={`font-medium ${vehicle.rcExpiringSoon ? "text-red-600" : "text-slate-900 dark:text-white"}`}>
              {new Date(vehicle.rcRenewalDate).toLocaleDateString("en-IN")}
            </span>
          </div>
        )}
        {vehicle.linkedInsurance && (
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <ShieldIcon className="h-3.5 w-3.5" /> Insurance
            </span>
            <span className={`font-medium ${vehicle.linkedInsurance.renewalSoon ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>
              {vehicle.linkedInsurance.insurerName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ShieldCheckIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>
  );
}

function ShieldIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
  );
}
