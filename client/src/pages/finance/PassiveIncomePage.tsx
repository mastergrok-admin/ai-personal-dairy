import { useState, useEffect } from "react";
import { Coins, Plus, Trash2, Edit2 } from "lucide-react";
import type { PassiveIncomeResponse, PassiveIncomeType } from "@diary/shared";
import {
  PASSIVE_INCOME_TYPE_LABELS,
} from "@diary/shared";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const PASSIVE_INCOME_TYPES: PassiveIncomeType[] = [
  "dividend_stock","dividend_mf","interest_fd","interest_savings",
  "interest_nsc","interest_ppf","sgb_interest","other",
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

const emptyForm = {
  incomeType: "dividend_stock" as PassiveIncomeType,
  amount: "",
  date: "",
  source: "",
  tdsDeducted: "",
  notes: "",
};

export default function PassiveIncomePage() {
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [entries, setEntries] = useState<PassiveIncomeResponse[]>([]);
  const [summary, setSummary] = useState<{ totalAmount: number; totalTdsDeducted: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PassiveIncomeResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/passive-income?fiscalYear=${fiscalYear}`, { credentials: "include" })
        .then((r) => r.json()),
      fetch(`${API}/api/passive-income/summary?fiscalYear=${fiscalYear}`, { credentials: "include" })
        .then((r) => r.json()),
    ]).then(([listRes, sumRes]) => {
      if (listRes.success) setEntries(listRes.data);
      if (sumRes.success) setSummary(sumRes.data);
      setLoading(false);
    });
  }, [fiscalYear]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm, date: new Date().toISOString().slice(0, 10) });
    setShowModal(true);
  }

  function openEdit(e: PassiveIncomeResponse) {
    setEditing(e);
    setForm({
      incomeType: e.incomeType,
      amount: String(e.amount / 100),
      date: e.date.slice(0, 10),
      source: e.source,
      tdsDeducted: String(e.tdsDeducted / 100),
      notes: e.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      amount: parseFloat(form.amount),
      tdsDeducted: parseFloat(form.tdsDeducted) || 0,
      date: new Date(form.date).toISOString(),
      notes: form.notes || undefined,
    };
    const url = editing ? `${API}/api/passive-income/${editing.id}` : `${API}/api/passive-income`;
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
        setEntries((prev) => prev.map((e) => (e.id === editing.id ? data.data : e)));
      } else {
        setEntries((prev) => [data.data, ...prev]);
      }
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`${API}/api/passive-income/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) {
      setEntries((prev) => prev.filter((p) => p.id !== id));
    }
  }

  function rupees(paise: number) {
    return (paise / 100).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Dividend & Interest Income
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(e.target.value)}
          >
            {getFiscalYears().map((fy) => (
              <option key={fy} value={fy}>FY {fy}</option>
            ))}
          </select>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Total Income (FY {fiscalYear})</p>
            <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
              {rupees(summary.totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500">TDS Deducted</p>
            <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
              {rupees(summary.totalTdsDeducted)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <p className="text-xs text-slate-500">Net Received</p>
            <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
              {rupees(summary.totalAmount - summary.totalTdsDeducted)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Coins className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No income entries for FY {fiscalYear}.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Type</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-400">Source</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">Amount</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">TDS</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {entries.map((e) => (
                <tr key={e.id} className="bg-white dark:bg-slate-800">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {new Date(e.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-slate-900 dark:text-white">
                    {PASSIVE_INCOME_TYPE_LABELS[e.incomeType]}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{e.source}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-white">
                    {rupees(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                    {e.tdsDeducted > 0 ? rupees(e.tdsDeducted) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Entry" : "Add Income"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Type</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.incomeType}
                  onChange={(e) => setForm({ ...form, incomeType: e.target.value as PassiveIncomeType })}
                >
                  {PASSIVE_INCOME_TYPES.map((t) => (
                    <option key={t} value={t}>{PASSIVE_INCOME_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">TDS Deducted (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.tdsDeducted}
                    onChange={(e) => setForm({ ...form, tdsDeducted: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Source</label>
                  <input
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="e.g. TCS dividend"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Notes (optional)</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
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
