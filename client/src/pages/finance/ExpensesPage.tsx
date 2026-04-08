import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, formatDate } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, FamilyMemberResponse, ExpenseResponse } from "@diary/shared";
import { EXPENSE_CATEGORY_LABELS } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as Array<keyof typeof EXPENSE_CATEGORY_LABELS>;

interface FormState {
  familyMemberId: string; category: string
  amount: string; date: string; description: string
}

const defaultForm = (): FormState => ({
  familyMemberId: "", category: "groceries", amount: "",
  date: new Date().toISOString().slice(0, 10), description: "",
});

function ExpensesPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [month, year]);

  async function fetchData() {
    setLoading(true);
    try {
      const [expRes, memRes] = await Promise.all([
        api.get<ApiResponse<ExpenseResponse[]>>(`/expenses?month=${month}&year=${year}`),
        api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
      ]);
      setExpenses(expRes.data ?? []);
      setMembers(memRes.data ?? []);
    } catch { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  }

  function navigate(delta: number) {
    let m = month + delta; let y = year;
    if (m > 12) { m = 1; y++; } if (m < 1) { m = 12; y--; }
    setMonth(m); setYear(y);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/expenses/${editingId}`, { category: form.category, amount, date: new Date(form.date).toISOString(), description: form.description || undefined });
        toast.success("Updated");
      } else {
        await api.post("/expenses", { familyMemberId: form.familyMemberId, category: form.category, amount, date: new Date(form.date).toISOString(), description: form.description || undefined });
        toast.success("Expense added");
      }
      setShowAdd(false); setEditingId(null); setForm(defaultForm());
      await fetchData();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  function startEdit(e: ExpenseResponse) {
    setEditingId(e.id);
    setForm({ familyMemberId: e.familyMemberId, category: e.category, amount: (Number(e.amount) / 100).toFixed(0), date: e.date.slice(0, 10), description: e.description ?? "" });
    setShowAdd(true);
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try { await api.delete(`/expenses/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await fetchData(); }
    catch { toast.error("Failed"); }
  }

  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const totalPaise = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">←</button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{MONTH_NAMES[month - 1]} {year}</h1>
          <button onClick={() => navigate(1)} className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700">→</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total: {formatINR(totalPaise)}</span>
          <ShimmerButton onClick={() => { setEditingId(null); setForm(defaultForm()); setShowAdd(true); }}>+ Add Expense</ShimmerButton>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Expense" : "Add Expense"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Family Member <span className="text-red-400">*</span></label>
              <select value={form.familyMemberId} onChange={(e) => setForm((f) => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                <option value="">Select…</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={inputCls}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Expense" description="Remove this expense entry?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {expenses.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 mb-2">No expenses for {MONTH_NAMES[month - 1]} {year}</p>
          <ShimmerButton onClick={() => setShowAdd(true)}>Add Expense</ShimmerButton>
        </div>
      )}

      <div className="space-y-2">
        {expenses.map((expense) => (
          <div key={expense.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100">{EXPENSE_CATEGORY_LABELS[expense.category]}</span>
                <span className="text-xs text-slate-400">{expense.familyMember?.name}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{formatDate(expense.date)}{expense.description ? ` · ${expense.description}` : ""}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-900 dark:text-slate-100">{formatINR(Number(expense.amount))}</span>
              <button onClick={() => startEdit(expense)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
              <button onClick={() => setDeleteTargetId(expense.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExpensesPage;
