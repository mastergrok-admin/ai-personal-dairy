import { useState, useEffect } from "react";
import { Calculator, Plus, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import type {
  TaxSummaryResponse,
  ManualDeductionSection,
  TaxRegime,
} from "@diary/shared";
import { MANUAL_DEDUCTION_LABELS } from "@diary/shared";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const MANUAL_SECTIONS: ManualDeductionSection[] = [
  "sec80C_nsc","sec80C_kvp","sec80C_children_tuition","sec80C_other",
  "sec80D_self_family","sec80D_parents","sec80D_parents_senior",
  "sec80E_education_loan_interest","sec80G_donation",
  "sec24b_home_loan_interest","hra","other",
];

function currentFiscalYear() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}

function getFiscalYears() {
  const fy = currentFiscalYear();
  const [sy] = fy.split("-").map(Number);
  return [fy, `${sy - 1}-${String(sy).slice(2)}`, `${sy - 2}-${String(sy - 1).slice(2)}`];
}

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function lakhFormat(paise: number) {
  const r = paise / 100;
  if (r >= 10_000_00) return `₹${(r / 10_00_000).toFixed(2)}Cr`;
  if (r >= 1_00_000) return `₹${(r / 1_00_000).toFixed(2)}L`;
  return `₹${r.toLocaleString("en-IN")}`;
}

export default function TaxPlannerPage() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [summary, setSummary] = useState<TaxSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDeduction, setShowAddDeduction] = useState(false);
  const [newSection, setNewSection] = useState<ManualDeductionSection>("sec80C_nsc");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadSummary() {
    setLoading(true);
    const res = await fetch(`${API}/api/tax/summary?fiscalYear=${fiscalYear}`, {
      credentials: "include",
    });
    const data = await res.json();
    if (data.success) setSummary(data.data);
    setLoading(false);
  }

  useEffect(() => {
    loadSummary();
  }, [fiscalYear]);

  async function handleRegimeChange(regime: TaxRegime) {
    await fetch(`${API}/api/tax/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fiscalYear, preferredRegime: regime }),
    });
    loadSummary();
  }

  async function handleAddDeduction() {
    setSaving(true);
    const res = await fetch(`${API}/api/tax/deductions`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fiscalYear,
        section: newSection,
        amount: parseFloat(newAmount),
        description: newDesc || undefined,
      }),
    });
    if ((await res.json()).success) {
      setShowAddDeduction(false);
      setNewAmount("");
      setNewDesc("");
      loadSummary();
    }
    setSaving(false);
  }

  async function handleDeleteDeduction(id: string) {
    if (!confirm("Remove this deduction?")) return;
    const res = await fetch(`${API}/api/tax/deductions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) loadSummary();
  }

  if (loading || !summary) {
    return <div className="p-6 text-slate-500">Loading...</div>;
  }

  const d = summary.deductions;
  const sec80CPercent = Math.min(100, Math.round((d.sec80C_total / d.sec80C_max) * 100));
  const oldBetter = summary.taxLiability.old < summary.taxLiability.new;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tax Planner</h1>
        </div>
        <select
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
        >
          {getFiscalYears().map((fy) => (
            <option key={fy} value={fy}>FY {fy}</option>
          ))}
        </select>
      </div>

      {/* Section 1 — 80C Tracker */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Section 80C</h2>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">
            {lakhFormat(d.sec80C_total)} invested
          </span>
          <span className="text-slate-500">Limit: ₹1,50,000</span>
        </div>
        <div className="mb-1 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all ${
              sec80CPercent >= 100 ? "bg-green-500" : "bg-ocean-accent"
            }`}
            style={{ width: `${sec80CPercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500">
          {d.sec80C_remaining > 0
            ? `₹${(d.sec80C_remaining / 100).toLocaleString("en-IN")} remaining room`
            : "80C limit fully utilised"}
        </p>

        <div className="mt-4 space-y-1.5">
          {[
            { label: "EPF (Employee)", val: d.epf },
            { label: "PPF", val: d.ppf },
            { label: "ELSS MFs", val: d.elss },
            { label: "Life Insurance", val: d.lifeInsurance },
            { label: "Home Loan Principal", val: d.homeLoanPrincipal },
            { label: "NSC", val: d.nsc },
            { label: "KVP", val: d.kvp },
            { label: "Children Tuition", val: d.childrenTuition },
            { label: "Other 80C", val: d.sec80C_other },
          ]
            .filter((r) => r.val > 0)
            .map((r) => (
              <div key={r.label} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">{r.label}</span>
                <span className="font-medium text-slate-900 dark:text-white">{rupees(r.val)}</span>
              </div>
            ))}
        </div>
      </section>

      {/* Section 2 — Other Deductions */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-white">Other Deductions</h2>
          <button
            onClick={() => setShowAddDeduction(true)}
            className="flex items-center gap-1.5 rounded-lg bg-ocean-accent/10 px-3 py-1.5 text-xs font-medium text-ocean-accent hover:bg-ocean-accent/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {/* Auto-derived health insurance */}
        {d.sec80D > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">80D — Health Insurance</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec80D)}</span>
          </div>
        )}
        {d.sec80E > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">80E — Education Loan Interest</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec80E)}</span>
          </div>
        )}
        {d.sec80G > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">80G — Donations</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec80G)}</span>
          </div>
        )}
        {d.sec24b > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">24b — Home Loan Interest</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.sec24b)}</span>
          </div>
        )}
        {d.hra > 0 && (
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">HRA</span>
            <span className="font-medium text-slate-900 dark:text-white">{rupees(d.hra)}</span>
          </div>
        )}

        {/* Manual deductions list */}
        {summary.manualDeductions.map((md) => (
          <div key={md.id} className="mb-1.5 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              {MANUAL_DEDUCTION_LABELS[md.section]}
              {md.description && <span className="ml-1 text-slate-400">({md.description})</span>}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-white">{rupees(md.amount)}</span>
              <button
                onClick={() => handleDeleteDeduction(md.id)}
                className="text-slate-300 hover:text-red-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {summary.manualDeductions.length === 0 && d.sec80D === 0 && d.sec80E === 0 && (
          <p className="text-sm text-slate-400">No deductions added yet.</p>
        )}

        {/* Add deduction inline form */}
        {showAddDeduction && (
          <div className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-600">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Section</label>
                <select
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value as ManualDeductionSection)}
                >
                  {MANUAL_SECTIONS.map((s) => (
                    <option key={s} value={s}>{MANUAL_DEDUCTION_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Amount (₹)</label>
                <input
                  type="number"
                  className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 50000"
                />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-xs text-slate-500">Description (optional)</label>
              <input
                className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowAddDeduction(false)}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDeduction}
                disabled={saving || !newAmount}
                className="rounded bg-ocean-accent px-3 py-1 text-xs text-white hover:bg-ocean-accent/90 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Section 3 — Regime Comparison */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Tax Regime Comparison</h2>
        <div className="grid grid-cols-2 gap-4">
          {(["old", "new"] as TaxRegime[]).map((regime) => {
            const isSelected = summary.regime === regime;
            const isBetter = regime === "old" ? oldBetter : !oldBetter;
            const taxable = summary.taxableIncome[regime];
            const liability = summary.taxLiability[regime];
            return (
              <div
                key={regime}
                className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                  isSelected
                    ? "border-ocean-accent bg-ocean-accent/5"
                    : "border-slate-200 dark:border-slate-600"
                }`}
                onClick={() => handleRegimeChange(regime)}
              >
                {isBetter && (
                  <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" /> Better
                  </span>
                )}
                <p className="text-sm font-semibold capitalize text-slate-700 dark:text-slate-300">
                  {regime} Regime
                </p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Taxable Income</span>
                    <span className="font-medium text-slate-900 dark:text-white">{rupees(taxable)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax + Cess</span>
                    <span className={`font-bold ${isBetter ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {rupees(liability)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">
          Click a regime to set it as preferred. Includes 4% cess. Standard deduction applied automatically.
        </p>
      </section>

      {/* Section 4 — Advance Tax */}
      {summary.advanceTax.required && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Advance Tax</h2>
          <div className="space-y-3">
            {[
              { by: summary.advanceTax.q1_by, amount: summary.advanceTax.q1_amount, label: "Q1 (15%)" },
              { by: summary.advanceTax.q2_by, amount: summary.advanceTax.q2_amount, label: "Q2 (45%)" },
              { by: summary.advanceTax.q3_by, amount: summary.advanceTax.q3_amount, label: "Q3 (75%)" },
              { by: summary.advanceTax.q4_by, amount: summary.advanceTax.q4_amount, label: "Q4 (100%)" },
            ].map((q) => {
              const isPast = new Date(q.by) < new Date();
              return (
                <div
                  key={q.by}
                  className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                    isPast
                      ? "bg-red-50 dark:bg-red-900/20"
                      : "bg-slate-50 dark:bg-slate-700/50"
                  }`}
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{q.label}</span>
                    <span className="ml-2 text-xs text-slate-500">by {q.by}</span>
                    {isPast && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" /> Due
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white">{rupees(q.amount)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 5 — Form 15G/H */}
      {summary.form15GH.fdAccounts.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">Form 15G/H — FD TDS Risk</h2>
          <div className="space-y-2">
            {summary.form15GH.fdAccounts.map((fd, i) => (
              <div
                key={i}
                className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                  fd.tdsRisk ? "bg-amber-50 dark:bg-amber-900/20" : "bg-slate-50 dark:bg-slate-700/50"
                }`}
              >
                <div>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{fd.bankName}</span>
                  <span className="ml-1 text-xs text-slate-500">••{fd.accountLast4}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    ~{rupees(fd.annualInterest)} interest
                  </span>
                  {fd.tdsRisk && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" /> File 15G/H
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            TDS risk when annual interest exceeds ₹40,000. File Form 15G (age &lt; 60) or 15H (age ≥ 60) to avoid TDS.
          </p>
        </section>
      )}
    </div>
  );
}
