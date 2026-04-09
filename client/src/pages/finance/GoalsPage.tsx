import { useState, useEffect } from "react";
import { Target, Plus, Edit2, Trash2, CheckCircle } from "lucide-react";
import type { FinancialGoalResponse, GoalCategory } from "@diary/shared";
import { GOAL_CATEGORY_LABELS } from "@diary/shared";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

const GOAL_CATEGORY_VALUES: GoalCategory[] = [
  "home_purchase","vehicle","education","wedding","retirement",
  "emergency_fund","travel","medical","other",
];

function rupees(paise: number) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

const emptyForm = {
  name: "",
  category: "other" as GoalCategory,
  targetAmount: "",
  targetDate: "",
  currentAmount: "",
  notes: "",
};

// SVG circular progress — radius 36, circumference ≈ 226
function CircularProgress({ percent }: { percent: number }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        className="transition-all duration-500"
      />
      <text
        x="44"
        y="49"
        textAnchor="middle"
        fontSize="14"
        fontWeight="700"
        fill="currentColor"
        className="text-slate-900 dark:text-white"
      >
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<FinancialGoalResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<FinancialGoalResponse | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch(`${API}/api/goals`, { credentials: "include" });
    const data = await res.json();
    if (data.success) setGoals(data.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(g: FinancialGoalResponse) {
    setEditing(g);
    setForm({
      name: g.name,
      category: g.category,
      targetAmount: String(g.targetAmount / 100),
      targetDate: g.targetDate.slice(0, 10),
      currentAmount: String(g.currentAmount / 100),
      notes: g.notes ?? "",
    });
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    const body = {
      ...form,
      targetAmount: parseFloat(form.targetAmount),
      currentAmount: parseFloat(form.currentAmount) || 0,
      targetDate: new Date(form.targetDate).toISOString(),
      notes: form.notes || undefined,
    };
    const url = editing ? `${API}/api/goals/${editing.id}` : `${API}/api/goals`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      load();
      setShowModal(false);
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this goal?")) return;
    const res = await fetch(`${API}/api/goals/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if ((await res.json()).success) {
      setGoals((prev) => prev.filter((g) => g.id !== id));
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-ocean-accent" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Financial Goals</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-ocean-accent px-4 py-2 text-sm font-medium text-white hover:bg-ocean-accent/90"
        >
          <Plus className="h-4 w-4" /> Add Goal
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center dark:border-slate-700">
          <Target className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">No financial goals set yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="relative flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
            >
              <CircularProgress percent={goal.progressPercent} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="truncate font-bold text-slate-900 dark:text-white">{goal.name}</h3>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(goal)} className="text-slate-400 hover:text-slate-600">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleDelete(goal.id)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">{GOAL_CATEGORY_LABELS[goal.category]}</p>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Target</span>
                    <span className="font-medium text-slate-900 dark:text-white">{rupees(goal.targetAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date</span>
                    <span className="font-medium text-slate-900 dark:text-white">
                      {new Date(goal.targetDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
                {goal.monthsRemaining > 0 && !goal.isAchieved && (
                  <div className="mt-2 rounded bg-ocean-accent/5 px-2 py-1 text-[10px] font-medium text-ocean-accent dark:bg-ocean-accent/10">
                    Save {rupees(goal.requiredMonthlySaving)}/mo for {goal.monthsRemaining} months
                  </div>
                )}
                {goal.isAchieved && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-green-600 uppercase tracking-wider">
                    <CheckCircle className="h-3 w-3" /> Goal Achieved
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {editing ? "Edit Goal" : "Add Goal"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Goal Name</label>
                <input
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. New Car"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Category</label>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as GoalCategory })}
                >
                  {GOAL_CATEGORY_VALUES.map((v) => (
                    <option key={v} value={v}>{GOAL_CATEGORY_LABELS[v]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Target Amount (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.targetAmount}
                    onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Current Saved (₹)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    value={form.currentAmount}
                    onChange={(e) => setForm({ ...form, currentAmount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Target Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                />
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
