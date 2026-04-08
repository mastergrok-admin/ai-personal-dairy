import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, FamilyMemberResponse, IncomeResponse } from "@diary/shared";
import { INCOME_SOURCE_LABELS, currentFiscalYear } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

const INCOME_SOURCES = Object.keys(INCOME_SOURCE_LABELS) as Array<keyof typeof INCOME_SOURCE_LABELS>;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface FormState {
  familyMemberId: string; source: string
  amount: string; month: string; year: string; description: string
}

const defaultForm: FormState = {
  familyMemberId: "", source: "salary",
  amount: "", month: String(new Date().getMonth() + 1),
  year: String(new Date().getFullYear()), description: "",
};

function IncomePage() {
  const [entries, setEntries] = useState<IncomeResponse[]>([]);
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear());
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [fiscalYear]);

  async function fetchData() {
    setLoading(true);
    try {
      const [incRes, memRes] = await Promise.all([
        api.get<ApiResponse<IncomeResponse[]>>(`/income?fiscalYear=${fiscalYear}`),
        api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
      ]);
      setEntries(incRes.data ?? []);
      setMembers(memRes.data ?? []);
    } catch { toast.error("Failed to load income"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid amount"); return; }
    if (!form.familyMemberId) { toast.error("Select a family member"); return; }
    setSubmitting(true);
    try {
      const body = {
        familyMemberId: form.familyMemberId, source: form.source,
        amount, month: parseInt(form.month), year: parseInt(form.year),
        description: form.description || undefined,
      };
      if (editingId) {
        await api.put(`/income/${editingId}`, { amount, description: form.description || undefined });
        toast.success("Income updated");
      } else {
        await api.post("/income", body);
        toast.success("Income added");
      }
      setShowAdd(false); setEditingId(null); setForm(defaultForm);
      await fetchData();
    } catch { toast.error(editingId ? "Failed to update" : "Failed to add income"); }
    finally { setSubmitting(false); }
  }

  function startEdit(entry: IncomeResponse) {
    setEditingId(entry.id);
    setForm({
      familyMemberId: entry.familyMemberId, source: entry.source,
      amount: (Number(entry.amount) / 100).toFixed(0),
      month: String(entry.month), year: String(entry.year),
      description: entry.description ?? "",
    });
    setShowAdd(true);
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try {
      await api.delete(`/income/${deleteTargetId}`);
      toast.success("Removed"); setDeleteTargetId(null); await fetchData();
    } catch { toast.error("Failed to remove"); }
  }

  // Group by month for display
  const byMonth = entries.reduce<Record<string, IncomeResponse[]>>((acc, e) => {
    const key = `${MONTHS[e.month - 1]} ${e.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(e); return acc;
  }, {});

  const totalPaise = entries.reduce((s, e) => s + Number(e.amount), 0);

  const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-8 w-40" />
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Income</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">FY {fiscalYear} · Total: {formatINR(totalPaise)}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className={inputCls + " w-32"}>
            {["2023-24","2024-25","2025-26","2026-27"].map((fy) => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>
          <ShimmerButton onClick={() => { setEditingId(null); setForm(defaultForm); setShowAdd(true); }}>+ Add Income</ShimmerButton>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); setForm(defaultForm); }} title={editingId ? "Edit Income" : "Add Income"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Family Member <span className="text-red-400">*</span></label>
            <select value={form.familyMemberId} onChange={(e) => setForm((f) => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Source</label>
            <select value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} className={inputCls} disabled={!!editingId}>
              {INCOME_SOURCES.map((s) => <option key={s} value={s}>{INCOME_SOURCE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="1" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Month</label>
            <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} className={inputCls} disabled={!!editingId}>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Year</label>
            <input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))} className={inputCls} disabled={!!editingId} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); setForm(defaultForm); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add Income"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Income" description="Remove this income entry? This cannot be undone.">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {entries.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No income recorded for FY {fiscalYear}</p>
          <ShimmerButton onClick={() => setShowAdd(true)}>Add Income</ShimmerButton>
        </div>
      )}

      {Object.entries(byMonth).map(([monthLabel, monthEntries]) => {
        const monthTotal = monthEntries.reduce((s, e) => s + Number(e.amount), 0);
        return (
          <div key={monthLabel} className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-1">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{monthLabel}</h2>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{formatINR(monthTotal)}</span>
            </div>
            {monthEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3">
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{INCOME_SOURCE_LABELS[entry.source]}</span>
                  <span className="ml-2 text-xs text-slate-400">{entry.familyMember?.name}</span>
                  {entry.description && <p className="text-xs text-slate-400 mt-0.5">{entry.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{formatINR(Number(entry.amount))}</span>
                  <button onClick={() => startEdit(entry)} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                  <button onClick={() => setDeleteTargetId(entry.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default IncomePage;
