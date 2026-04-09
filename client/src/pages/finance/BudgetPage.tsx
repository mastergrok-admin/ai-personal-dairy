import { useState, useEffect } from "react";
import { PiggyBank, ChevronLeft, ChevronRight, Plus, Save, Copy } from "lucide-react";
import type { BudgetVsActualResponse, ExpenseCategory } from "@diary/shared";
import { EXPENSE_CATEGORY_LABELS } from "@diary/shared";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "groceries","vegetables_fruits","fuel","transport","school_fees","medical",
  "utilities","internet_mobile","religious","eating_out","clothing","rent",
  "household","other",
];

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function monthName(month: number, year: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default function BudgetPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [budgetId, setBudgetId] = useState<string | null>(null);
  const [vsActual, setVsActual] = useState<BudgetVsActualResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  // editAmounts: category → rupee string for input
  const [editAmounts, setEditAmounts] = useState<Partial<Record<ExpenseCategory, string>>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [budgetRes, vsRes] = await Promise.all([
      fetch(`${API}/api/budget?month=${month}&year=${year}`, { credentials: "include" })
        .then((r) => r.json()),
      fetch(`${API}/api/budget/vs-actual?month=${month}&year=${year}`, { credentials: "include" })
        .then((r) => r.json()),
    ]);

    if (budgetRes.success) {
      setBudgetId(budgetRes.data.id);
      // pre-fill edit amounts from budget items
      const amounts: Partial<Record<ExpenseCategory, string>> = {};
      for (const item of budgetRes.data.items) {
        amounts[item.category as ExpenseCategory] = String(item.budgetAmount / 100);
      }
      setEditAmounts(amounts);
    } else {
      setBudgetId(null);
      setEditAmounts({});
    }
    if (vsRes.success) setVsActual(vsRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [month, year]);

  function navigate(delta: number) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1) { m = 12; y--; }
    setMonth(m);
    setYear(y);
    setEditMode(false);
  }

  async function handleSave() {
    setSaving(true);
    const items = EXPENSE_CATEGORIES
      .filter((c) => editAmounts[c] && parseFloat(editAmounts[c]!) > 0)
      .map((c) => ({ category: c, budgetAmount: parseFloat(editAmounts[c]!) }));

    let res;
    if (budgetId) {
      res = await fetch(`${API}/api/budget/${budgetId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } else {
      res = await fetch(`${API}/api/budget`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, items }),
      });
    }
    const data = await res.json();
    if (data.success) {
      setBudgetId(data.data.id);
      setEditMode(false);
      load();
    }
    setSaving(false);
  }

  async function handleCopyFromPrevious() {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const res = await fetch(`${API}/api/budget`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month,
        year,
        copyFromMonth: prevMonth,
        copyFromYear: prevYear,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setBudgetId(data.data.id);
      load();
    }
  }

  const noBudget = !budgetId && !loading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PiggyBank className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Budget Planner</h1>
        </div>
        <div className="flex items-center gap-2">
          {budgetId && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              Edit Budget
            </button>
          )}
          {editMode && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-lg font-semibold text-slate-900 dark:text-white">
          {monthName(month, year)}
        </span>
        <button
          onClick={() => navigate(1)}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : noBudget ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <PiggyBank className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="mb-4 text-slate-500">No budget set for {monthName(month, year)}.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setEditMode(true)}
              className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
            >
              <Plus className="h-4 w-4" /> Set Up Budget
            </button>
            <button
              onClick={handleCopyFromPrevious}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
            >
              <Copy className="h-4 w-4" /> Copy from Previous Month
            </button>
          </div>
        </div>
      ) : editMode ? (
        /* Edit mode — input grid */
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">
            Set budget amounts (₹)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {EXPENSE_CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <label className="w-40 flex-shrink-0 text-sm text-slate-600 dark:text-slate-400">
                  {EXPENSE_CATEGORY_LABELS[cat]}
                </label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  placeholder="0"
                  value={editAmounts[cat] ?? ""}
                  onChange={(e) =>
                    setEditAmounts((prev) => ({ ...prev, [cat]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* View mode — vs actual table */
        vsActual && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Total Budgeted</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {rupees(vsActual.totalBudget)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Total Spent</p>
                <p className={`mt-1 text-2xl font-bold ${vsActual.totalActual > vsActual.totalBudget ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                  {rupees(vsActual.totalActual)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
                <p className="text-xs text-slate-500">Savings Rate</p>
                <p className={`mt-1 text-2xl font-bold ${vsActual.savingsRate >= 20 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {vsActual.savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Category rows */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              {vsActual.items.map((item, i) => {
                const pct = item.budgeted > 0 ? Math.min(100, Math.round((item.actual / item.budgeted) * 100)) : 100;
                const barColor =
                  item.status === "over"
                    ? "bg-red-500"
                    : item.status === "warning"
                    ? "bg-amber-500"
                    : "bg-green-500";
                return (
                  <div
                    key={item.category}
                    className={`px-5 py-4 ${i > 0 ? "border-t border-slate-100 dark:border-slate-700" : ""}`}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">{rupees(item.actual)}</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          {item.budgeted > 0 ? rupees(item.budgeted) : "No budget"}
                        </span>
                        <span
                          className={`w-14 rounded-full px-2 py-0.5 text-center text-xs font-medium ${
                            item.status === "over"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : item.status === "warning"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}
                        >
                          {item.status === "over" ? "Over" : item.status === "warning" ? "Near" : "OK"}
                        </span>
                      </div>
                    </div>
                    {item.budgeted > 0 && (
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}
