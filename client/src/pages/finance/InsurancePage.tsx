import { useState, useEffect } from "react";
import { Shield, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";
import type {
  InsurancePolicyResponse,
  InsuranceType,
  PremiumFrequency,
  Relationship,
} from "@diary/shared";
import {
  INSURANCE_TYPE_LABELS,
  PREMIUM_FREQUENCY_LABELS,
} from "@diary/shared";

interface FamilyMember { id: string; name: string; relationship: Relationship }

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const INSURANCE_TYPE_VALUES: InsuranceType[] = [
  "term_life","whole_life","ulip","health_individual","health_family_floater",
  "vehicle_car","vehicle_two_wheeler","property","pmjjby","pmsby","other",
];
const PREMIUM_FREQUENCY_VALUES: PremiumFrequency[] = [
  "monthly","quarterly","half_yearly","annual","single",
];

const emptyForm = {
  familyMemberId: "",
  insuranceType: "term_life" as InsuranceType,
  insurerName: "",
  policyLast6: "",
  sumAssured: "",
  premiumAmount: "",
  premiumFrequency: "annual" as PremiumFrequency,
  startDate: "",
  renewalDate: "",
  nomineeName: "",
  notes: "",
};

export default function InsurancePage() {
  const [policies, setPolicies] = useState<InsurancePolicyResponse[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<InsurancePolicyResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/insurance`, { credentials: "include" }).then((r) => r.json()),
      fetch(`${API}/api/family-members`, { credentials: "include" }).then((r) => r.json()),
    ]).then(([insRes, memRes]) => {
      if (insRes.success) setPolicies(insRes.data);
      if (memRes.success) setMembers(memRes.data);
      setLoading(false);
    });
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, familyMemberId: members[0]?.id ?? "" });
    setShowModal(true);
  }

  function openEdit(p: InsurancePolicyResponse) {
    setEditing(p);
    setForm({
      familyMemberId: p.familyMemberId,
      insuranceType: p.insuranceType,
      insurerName: p.insurerName,
      policyLast6: p.policyLast6 ?? "",
      sumAssured: String(p.sumAssured / 100),
      premiumAmount: String(p.premiumAmount / 100),
      premiumFrequency: p.premiumFrequency,
      startDate: p.startDate.slice(0, 10),
      renewalDate: p.renewalDate.slice(0, 10),
      nomineeName: p.nomineeName ?? "",
      notes: p.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      sumAssured: parseFloat(form.sumAssured),
      premiumAmount: parseFloat(form.premiumAmount),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      renewalDate: form.renewalDate ? new Date(form.renewalDate).toISOString() : undefined,
      policyLast6: form.policyLast6 || undefined,
      nomineeName: form.nomineeName || undefined,
      notes: form.notes || undefined,
    };
    const url = editing
      ? `${API}/api/insurance/${editing.id}`
      : `${API}/api/insurance`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      if (editing) {
        setPolicies((prev) => prev.map((p) => (p.id === editing.id ? data.data : p)));
      } else {
        setPolicies((prev) => [...prev, data.data]);
      }
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this policy?")) return;
    const res = await fetch(`${API}/api/insurance/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) {
      setPolicies((prev) => prev.filter((p) => p.id !== id));
    }
  }

  const renewingSoon = policies.filter((p) => p.renewalSoon);
  const others = policies.filter((p) => !p.renewalSoon);

  if (loading) {
    return (
      <div className="p-6 text-slate-500 dark:text-slate-400">Loading...</div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Insurance
          </h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Policy
        </button>
      </div>

      {/* Renewing soon */}
      {renewingSoon.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-600">
            Renewing Within 30 Days
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {renewingSoon.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p.id)}
                urgent
              />
            ))}
          </div>
        </section>
      )}

      {/* All other policies */}
      {others.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            All Policies
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => (
              <PolicyCard
                key={p.id}
                policy={p}
                onEdit={() => openEdit(p)}
                onDelete={() => handleDelete(p.id)}
                urgent={false}
              />
            ))}
          </div>
        </section>
      )}

      {policies.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Shield className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No insurance policies added yet.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Policy" : "Add Policy"}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Family Member
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.familyMemberId}
                    onChange={(e) => setForm({ ...form, familyMemberId: e.target.value })}
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Insurance Type
                  </label>
                  <select
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.insuranceType}
                    onChange={(e) =>
                      setForm({ ...form, insuranceType: e.target.value as InsuranceType })
                    }
                    disabled={!!editing}
                  >
                    {INSURANCE_TYPE_VALUES.map((t) => (
                      <option key={t} value={t}>
                        {INSURANCE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Insurer Name
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.insurerName}
                    onChange={(e) => setForm({ ...form, insurerName: e.target.value })}
                    placeholder="e.g. HDFC Life"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Policy Last 6 Digits
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.policyLast6}
                    maxLength={6}
                    onChange={(e) => setForm({ ...form, policyLast6: e.target.value })}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Sum Assured (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.sumAssured}
                    onChange={(e) => setForm({ ...form, sumAssured: e.target.value })}
                    placeholder="e.g. 10000000"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Premium (₹)
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.premiumAmount}
                    onChange={(e) => setForm({ ...form, premiumAmount: e.target.value })}
                    placeholder="e.g. 12000"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Premium Frequency
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.premiumFrequency}
                  onChange={(e) =>
                    setForm({ ...form, premiumFrequency: e.target.value as PremiumFrequency })
                  }
                >
                  {PREMIUM_FREQUENCY_VALUES.map((f) => (
                    <option key={f} value={f}>
                      {PREMIUM_FREQUENCY_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    disabled={!!editing}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Renewal Date
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.renewalDate}
                    onChange={(e) => setForm({ ...form, renewalDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Nominee Name (optional)
                </label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.nomineeName}
                  onChange={(e) => setForm({ ...form, nomineeName: e.target.value })}
                  placeholder="Nominee full name"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Notes (optional)
                </label>
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
    </div>
  );
}

function PolicyCard({
  policy,
  onEdit,
  onDelete,
  urgent,
}: {
  policy: InsurancePolicyResponse;
  onEdit: () => void;
  onDelete: () => void;
  urgent: boolean;
}) {
  function paiseToRupees(paise: number) {
    return (paise / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  }

  return (
    <div
      className={`rounded-xl border p-4 ${
        urgent
          ? "border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
          : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {policy.insurerName}
            </span>
            {urgent && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {INSURANCE_TYPE_LABELS[policy.insuranceType]}
            {policy.policyLast6 ? ` — ••${policy.policyLast6}` : ""}
          </span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Sum Assured</span>
          <p className="font-medium text-slate-900 dark:text-white">
            {paiseToRupees(policy.sumAssured)}
          </p>
        </div>
        <div>
          <span className="text-slate-500">Premium</span>
          <p className="font-medium text-slate-900 dark:text-white">
            {paiseToRupees(policy.premiumAmount)}{" "}
            <span className="text-slate-400">/ {PREMIUM_FREQUENCY_LABELS[policy.premiumFrequency]}</span>
          </p>
        </div>
        <div className="col-span-2">
          <span className="text-slate-500">Renews</span>
          <p className={`font-medium ${urgent ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
            {new Date(policy.renewalDate).toLocaleDateString("en-IN")}{" "}
            <span className="text-slate-400">
              ({policy.daysUntilRenewal > 0 ? `${policy.daysUntilRenewal}d` : "Overdue"})
            </span>
          </p>
        </div>
        {policy.familyMember && (
          <div className="col-span-2">
            <span className="text-slate-500">For</span>
            <p className="font-medium text-slate-900 dark:text-white capitalize">
              {policy.familyMember.name}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
