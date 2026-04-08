import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, formatDate } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, PersonalLendingResponse } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

interface LendForm {
  direction: "lent" | "borrowed"; personName: string; personPhone: string
  principalAmount: string; date: string; purpose: string
  expectedRepaymentDate: string; notes: string
}
interface RepayForm { amount: string; date: string; notes: string }

const defaultLendForm = (): LendForm => ({
  direction: "lent", personName: "", personPhone: "", principalAmount: "",
  date: new Date().toISOString().slice(0, 10), purpose: "", expectedRepaymentDate: "", notes: "",
});
const defaultRepayForm = (): RepayForm => ({ amount: "", date: new Date().toISOString().slice(0, 10), notes: "" });

const STATUS_BADGE: Record<string, string> = {
  outstanding: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  partially_repaid: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  settled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

function LendingPage() {
  const [records, setRecords] = useState<PersonalLendingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"lent" | "borrowed">("lent");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LendForm>(defaultLendForm());
  const [submitting, setSubmitting] = useState(false);
  const [repayTargetId, setRepayTargetId] = useState<string | null>(null);
  const [repayForm, setRepayForm] = useState<RepayForm>(defaultRepayForm());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PersonalLendingResponse[]>>("/lending");
      setRecords(res.data ?? []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.principalAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid amount"); return; }
    setSubmitting(true);
    try {
      const body = {
        direction: form.direction, personName: form.personName,
        personPhone: form.personPhone || undefined, principalAmount: amount,
        date: new Date(form.date).toISOString(),
        purpose: form.purpose || undefined,
        expectedRepaymentDate: form.expectedRepaymentDate ? new Date(form.expectedRepaymentDate).toISOString() : undefined,
        notes: form.notes || undefined,
      };
      if (editingId) { await api.put(`/lending/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/lending", body); toast.success("Added"); }
      setShowAdd(false); setEditingId(null); setForm(defaultLendForm());
      await fetchData();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleRepay(e: React.FormEvent) {
    e.preventDefault();
    if (!repayTargetId) return;
    const amount = parseFloat(repayForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter valid amount"); return; }
    try {
      await api.post(`/lending/${repayTargetId}/repayments`, { amount, date: new Date(repayForm.date).toISOString(), notes: repayForm.notes || undefined });
      toast.success("Repayment recorded");
      setRepayTargetId(null); setRepayForm(defaultRepayForm());
      await fetchData();
    } catch { toast.error("Failed"); }
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try { await api.delete(`/lending/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await fetchData(); }
    catch { toast.error("Failed"); }
  }

  const filtered = records.filter((r) => r.direction === activeTab);
  const totalOutstanding = filtered.filter((r) => r.status !== "settled").reduce((s, r) => s + Number(r.outstandingAmount), 0);
  const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-6 space-y-4"><Skeleton className="h-8 w-40" />{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lending & Borrowing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Outstanding: {formatINR(totalOutstanding)}</p>
        </div>
        <ShimmerButton onClick={() => { setEditingId(null); setForm({ ...defaultLendForm(), direction: activeTab }); setShowAdd(true); }}>+ Add</ShimmerButton>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 w-fit">
        {(["lent", "borrowed"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${activeTab === tab ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}>
            {tab === "lent" ? "Lent by me" : "I owe"}
          </button>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Record" : `Add ${form.direction === "lent" ? "Lent" : "Borrowed"}`}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Person Name <span className="text-red-400">*</span></label>
            <input type="text" value={form.personName} onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))} required className={inputCls} placeholder="Ramesh Kumar" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="tel" value={form.personPhone} onChange={(e) => setForm((f) => ({ ...f, personPhone: e.target.value }))} className={inputCls} placeholder="9876543210" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="1" step="1" value={form.principalAmount} onChange={(e) => setForm((f) => ({ ...f, principalAmount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expected Repayment <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="date" value={form.expectedRepaymentDate} onChange={(e) => setForm((f) => ({ ...f, expectedRepaymentDate: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Purpose <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} className={inputCls} placeholder="Medical, business, etc." />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Repayment Modal */}
      <Modal open={repayTargetId !== null} onClose={() => setRepayTargetId(null)} title="Record Repayment">
        <form onSubmit={handleRepay} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="1" step="1" value={repayForm.amount} onChange={(e) => setRepayForm((f) => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
            <input type="date" value={repayForm.date} onChange={(e) => setRepayForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={repayForm.notes} onChange={(e) => setRepayForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setRepayTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit">Record</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Record" description="Remove this lending record?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {filtered.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 mb-2">No {activeTab === "lent" ? "money lent" : "money borrowed"} recorded</p>
          <ShimmerButton onClick={() => { setForm({ ...defaultLendForm(), direction: activeTab }); setShowAdd(true); }}>Add</ShimmerButton>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((record) => {
          const isOverdue = record.status !== "settled" && record.expectedRepaymentDate && new Date(record.expectedRepaymentDate) < new Date();
          return (
            <div key={record.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{record.personName}</span>
                    {record.personPhone && <span className="text-xs text-slate-400">{record.personPhone}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[record.status]}`}>{record.status.replace("_", " ")}</span>
                    {isOverdue && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overdue</span>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs mt-2">
                    <div><span className="text-slate-400 uppercase">Principal</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(Number(record.principalAmount))}</p></div>
                    <div><span className="text-slate-400 uppercase">Outstanding</span><p className={`font-semibold ${record.status === "settled" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>{formatINR(Number(record.outstandingAmount))}</p></div>
                    <div><span className="text-slate-400 uppercase">Date</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(record.date)}</p></div>
                    {record.expectedRepaymentDate && <div><span className="text-slate-400 uppercase">Expected by</span><p className={`font-semibold ${isOverdue ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200"}`}>{formatDate(record.expectedRepaymentDate)}</p></div>}
                  </div>
                  {record.purpose && <p className="text-xs text-slate-400 mt-1.5">Purpose: {record.purpose}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                  {record.status !== "settled" && (
                    <button onClick={() => { setRepayTargetId(record.id); setRepayForm(defaultRepayForm()); }} className="text-xs px-2.5 py-1 rounded-lg bg-ocean-700 text-white hover:bg-ocean-600">Repayment</button>
                  )}
                  <button onClick={() => { setEditingId(record.id); setForm({ direction: record.direction, personName: record.personName, personPhone: record.personPhone ?? "", principalAmount: (Number(record.principalAmount) / 100).toFixed(0), date: record.date.slice(0, 10), purpose: record.purpose ?? "", expectedRepaymentDate: record.expectedRepaymentDate?.slice(0, 10) ?? "", notes: record.notes ?? "" }); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                  <button onClick={() => setDeleteTargetId(record.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LendingPage;
