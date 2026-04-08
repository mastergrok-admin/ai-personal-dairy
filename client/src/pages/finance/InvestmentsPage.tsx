import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import { formatINR, formatDate } from "@/utils/format";
import toast from "react-hot-toast";
import type {
  ApiResponse,
  FamilyMemberResponse,
  InvestmentSummary,
  MutualFundResponse,
  MFTransactionType,
  PPFAccountResponse,
  EPFAccountResponse,
  NPSAccountResponse,
  PostOfficeSchemeResponse,
  SGBHoldingResponse,
  ChitFundResponse,
  GoldHoldingResponse,
  PropertyResponse,
} from "@diary/shared";
import {
  MF_SCHEME_TYPE_LABELS,
  POST_OFFICE_SCHEME_LABELS,
  GOLD_PURITY_LABELS,
  PROPERTY_TYPE_LABELS,
} from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

const TABS = [
  { key: "mf", label: "Mutual Funds" },
  { key: "ppf_epf_nps", label: "PPF / EPF / NPS" },
  { key: "gold", label: "Gold" },
  { key: "properties", label: "Properties" },
  { key: "post_office", label: "Post Office" },
  { key: "sgb", label: "SGB" },
  { key: "chit_funds", label: "Chit Funds" },
] as const;

type Tab = typeof TABS[number]["key"];

const inputCls = "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";
const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

// ── Mutual Funds tab ───────────────────────────────────────────────────────

const MF_SCHEME_TYPES = Object.keys(MF_SCHEME_TYPE_LABELS) as Array<keyof typeof MF_SCHEME_TYPE_LABELS>;
const MF_TX_TYPES: MFTransactionType[] = ["sip","lumpsum","redemption","switch_in","switch_out","dividend","bonus"];

interface MFForm { familyMemberId: string; fundName: string; amcName: string; schemeType: string; folioLast4: string; sipAmount: string; sipDate: string }
interface MFTxForm { type: MFTransactionType; amount: string; units: string; nav: string; date: string; notes: string }

function MFTab({ members }: { members: FamilyMemberResponse[] }) {
  const [funds, setFunds] = useState<MutualFundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MFForm>({ familyMemberId: "", fundName: "", amcName: "", schemeType: "equity", folioLast4: "", sipAmount: "", sipDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [txTargetId, setTxTargetId] = useState<string | null>(null);
  const [txForm, setTxForm] = useState<MFTxForm>({ type: "sip", amount: "", units: "", nav: "", date: new Date().toISOString().slice(0, 10), notes: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFunds((await api.get<ApiResponse<MutualFundResponse[]>>("/mutual-funds")).data ?? []); }
    catch { toast.error("Failed to load mutual funds"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitFund(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: form.familyMemberId, fundName: form.fundName, amcName: form.amcName, schemeType: form.schemeType };
    if (form.folioLast4.length === 4) body.folioLast4 = form.folioLast4;
    if (form.sipAmount) body.sipAmount = parseFloat(form.sipAmount);
    if (form.sipDate) body.sipDate = parseInt(form.sipDate);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/mutual-funds/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/mutual-funds", body); toast.success("Fund added"); }
      setShowAdd(false); setEditingId(null);
      setForm({ familyMemberId: "", fundName: "", amcName: "", schemeType: "equity", folioLast4: "", sipAmount: "", sipDate: "" });
      await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function submitTx(e: React.FormEvent) {
    e.preventDefault();
    if (!txTargetId) return;
    const amount = parseFloat(txForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter valid amount"); return; }
    const body: any = { type: txForm.type, amount, date: new Date(txForm.date).toISOString() };
    if (txForm.units) body.units = parseFloat(txForm.units);
    if (txForm.nav) body.nav = parseFloat(txForm.nav);
    if (txForm.notes) body.notes = txForm.notes;
    try {
      await api.post(`/mutual-funds/${txTargetId}/transactions`, body);
      toast.success("Transaction added"); setTxTargetId(null);
      setTxForm({ type: "sip", amount: "", units: "", nav: "", date: new Date().toISOString().slice(0, 10), notes: "" });
      await load();
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Fund</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Fund" : "Add Mutual Fund"}>
        <form onSubmit={submitFund} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Fund Name *</label>
            <input type="text" value={form.fundName} onChange={e => setForm(f => ({ ...f, fundName: e.target.value }))} required className={inputCls} placeholder="Parag Parikh Flexi Cap" />
          </div>
          <div><label className={labelCls}>AMC Name *</label>
            <input type="text" value={form.amcName} onChange={e => setForm(f => ({ ...f, amcName: e.target.value }))} required className={inputCls} placeholder="PPFAS" />
          </div>
          <div><label className={labelCls}>Scheme Type</label>
            <select value={form.schemeType} onChange={e => setForm(f => ({ ...f, schemeType: e.target.value }))} className={inputCls}>
              {MF_SCHEME_TYPES.map(t => <option key={t} value={t}>{MF_SCHEME_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Folio Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" maxLength={4} value={form.folioLast4} onChange={e => setForm(f => ({ ...f, folioLast4: e.target.value }))} className={inputCls} placeholder="1234" />
          </div>
          <div><label className={labelCls}>SIP Amount ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.sipAmount} onChange={e => setForm(f => ({ ...f, sipAmount: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>SIP Date (day 1-28) <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="1" max="28" value={form.sipDate} onChange={e => setForm(f => ({ ...f, sipDate: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={txTargetId !== null} onClose={() => setTxTargetId(null)} title="Add Transaction">
        <form onSubmit={submitTx} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><label className={labelCls}>Type</label>
            <select value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value as MFTransactionType }))} className={inputCls}>
              {MF_TX_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Amount ₹ *</label>
            <input type="number" min="0" value={txForm.amount} onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Units <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" step="0.001" value={txForm.units} onChange={e => setTxForm(f => ({ ...f, units: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>NAV <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" step="0.01" value={txForm.nav} onChange={e => setTxForm(f => ({ ...f, nav: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Date</label>
            <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Notes <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setTxTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit">Add Transaction</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Fund" description="Soft-delete this fund and all its transactions?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/mutual-funds/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {funds.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 mb-2">No mutual funds added yet</p>
          <ShimmerButton onClick={() => setShowAdd(true)}>Add Fund</ShimmerButton>
        </div>
      )}

      <div className="space-y-3">
        {funds.map(fund => (
          <div key={fund.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{fund.fundName}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-ocean-100 text-ocean-700 dark:bg-ocean-900/30 dark:text-ocean-400">{MF_SCHEME_TYPE_LABELS[fund.schemeType]}</span>
                </div>
                <p className="text-xs text-slate-400">{fund.amcName}{fund.folioLast4 ? ` · Folio …${fund.folioLast4}` : ""} · {fund.familyMember?.name}</p>
                <div className="grid grid-cols-3 gap-x-4 text-xs mt-2">
                  <div><span className="text-slate-400">Units</span><p className="font-semibold text-slate-800 dark:text-slate-200">{fund.totalUnits.toFixed(3)}</p></div>
                  <div><span className="text-slate-400">Invested</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(fund.investedPaise)}</p></div>
                  {fund.sipAmount ? <div><span className="text-slate-400">SIP</span><p className="font-semibold text-slate-800 dark:text-slate-200">{formatINR(fund.sipAmount)}/mo</p></div> : null}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => setTxTargetId(fund.id)} className="text-xs px-2.5 py-1 rounded-lg bg-ocean-700 text-white hover:bg-ocean-600">+ Txn</button>
                <button onClick={() => { setEditingId(fund.id); setForm({ familyMemberId: fund.familyMemberId, fundName: fund.fundName, amcName: fund.amcName, schemeType: fund.schemeType, folioLast4: fund.folioLast4 ?? "", sipAmount: fund.sipAmount ? String(fund.sipAmount / 100) : "", sipDate: fund.sipDate ? String(fund.sipDate) : "" }); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTargetId(fund.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
            {fund.transactions.length > 0 && (
              <div className="mt-3">
                <button onClick={() => setExpandedId(expandedId === fund.id ? null : fund.id)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {expandedId === fund.id ? "Hide" : "Show"} {fund.transactions.length} transaction{fund.transactions.length !== 1 ? "s" : ""}
                </button>
                {expandedId === fund.id && (
                  <div className="mt-2 space-y-1">
                    {fund.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
                        <span className="text-slate-500 dark:text-slate-400">{formatDate(tx.date)} · {tx.type.replace("_", " ")}</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{formatINR(tx.amount)}{tx.units ? ` · ${tx.units.toFixed(3)} units` : ""}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PPF / EPF / NPS tab ────────────────────────────────────────────────────

function PPFEPFNPSTab({ members }: { members: FamilyMemberResponse[] }) {
  const [ppf, setPPF] = useState<PPFAccountResponse[]>([]);
  const [epf, setEPF] = useState<EPFAccountResponse[]>([]);
  const [nps, setNPS] = useState<NPSAccountResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"ppf" | "epf" | "nps">("ppf");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "ppf" | "epf" | "nps" } | null>(null);

  // PPF form
  const [ppfForm, setPPFForm] = useState({ familyMemberId: "", accountLast4: "", bankOrPostOffice: "", openingDate: "", maturityDate: "", currentBalance: "", annualContribution: "" });
  // EPF form
  const [epfForm, setEPFForm] = useState({ familyMemberId: "", uanLast4: "", employerName: "", monthlyEmployeeContrib: "", monthlyEmployerContrib: "", currentBalance: "" });
  // NPS form
  const [npsForm, setNPSForm] = useState({ familyMemberId: "", pranLast4: "", tier: "tier1", monthlyContrib: "", currentCorpus: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e, n] = await Promise.all([
        api.get<ApiResponse<PPFAccountResponse[]>>("/ppf"),
        api.get<ApiResponse<EPFAccountResponse[]>>("/epf"),
        api.get<ApiResponse<NPSAccountResponse[]>>("/nps"),
      ]);
      setPPF(p.data ?? []); setEPF(e.data ?? []); setNPS(n.data ?? []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function submitPPF(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: ppfForm.familyMemberId, bankOrPostOffice: ppfForm.bankOrPostOffice, openingDate: new Date(ppfForm.openingDate).toISOString(), maturityDate: new Date(ppfForm.maturityDate).toISOString() };
    if (ppfForm.accountLast4.length === 4) body.accountLast4 = ppfForm.accountLast4;
    if (ppfForm.currentBalance) body.currentBalance = parseFloat(ppfForm.currentBalance);
    if (ppfForm.annualContribution) body.annualContribution = parseFloat(ppfForm.annualContribution);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/ppf/${editingId}`, { currentBalance: body.currentBalance, annualContribution: body.annualContribution }); toast.success("Updated"); }
      else { await api.post("/ppf", body); toast.success("PPF account added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function submitEPF(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: epfForm.familyMemberId, employerName: epfForm.employerName };
    if (epfForm.uanLast4.length === 4) body.uanLast4 = epfForm.uanLast4;
    if (epfForm.monthlyEmployeeContrib) body.monthlyEmployeeContrib = parseFloat(epfForm.monthlyEmployeeContrib);
    if (epfForm.monthlyEmployerContrib) body.monthlyEmployerContrib = parseFloat(epfForm.monthlyEmployerContrib);
    if (epfForm.currentBalance) body.currentBalance = parseFloat(epfForm.currentBalance);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/epf/${editingId}`, { currentBalance: body.currentBalance, employerName: body.employerName }); toast.success("Updated"); }
      else { await api.post("/epf", body); toast.success("EPF account added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function submitNPS(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { familyMemberId: npsForm.familyMemberId, tier: npsForm.tier };
    if (npsForm.pranLast4.length === 4) body.pranLast4 = npsForm.pranLast4;
    if (npsForm.monthlyContrib) body.monthlyContrib = parseFloat(npsForm.monthlyContrib);
    if (npsForm.currentCorpus) body.currentCorpus = parseFloat(npsForm.currentCorpus);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/nps/${editingId}`, { currentCorpus: body.currentCorpus, monthlyContrib: body.monthlyContrib }); toast.success("Updated"); }
      else { await api.post("/nps", body); toast.success("NPS account added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/${deleteTarget.type}/${deleteTarget.id}`);
      toast.success("Removed"); setDeleteTarget(null); await load();
    } catch { toast.error("Failed"); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 w-fit">
          {(["ppf","epf","nps"] as const).map(t => (
            <button key={t} onClick={() => setSubTab(t)} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${subTab === t ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add</ShimmerButton>
      </div>

      {/* PPF list */}
      {subTab === "ppf" && (
        <>
          <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit PPF" : "Add PPF Account"}>
            <form onSubmit={submitPPF} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editingId && <>
                <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
                  <select value={ppfForm.familyMemberId} onChange={e => setPPFForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                    <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Bank / Post Office *</label>
                  <input type="text" value={ppfForm.bankOrPostOffice} onChange={e => setPPFForm(f => ({ ...f, bankOrPostOffice: e.target.value }))} required className={inputCls} />
                </div>
                <div><label className={labelCls}>Account Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
                  <input type="text" maxLength={4} value={ppfForm.accountLast4} onChange={e => setPPFForm(f => ({ ...f, accountLast4: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Opening Date *</label>
                  <input type="date" value={ppfForm.openingDate} onChange={e => setPPFForm(f => ({ ...f, openingDate: e.target.value }))} required className={inputCls} />
                </div>
                <div><label className={labelCls}>Maturity Date *</label>
                  <input type="date" value={ppfForm.maturityDate} onChange={e => setPPFForm(f => ({ ...f, maturityDate: e.target.value }))} required className={inputCls} />
                </div>
              </>}
              <div><label className={labelCls}>Current Balance ₹</label>
                <input type="number" min="0" value={ppfForm.currentBalance} onChange={e => setPPFForm(f => ({ ...f, currentBalance: e.target.value }))} className={inputCls} />
              </div>
              <div><label className={labelCls}>Annual Contribution ₹</label>
                <input type="number" min="0" value={ppfForm.annualContribution} onChange={e => setPPFForm(f => ({ ...f, annualContribution: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
                <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
              </div>
            </form>
          </Modal>
          {ppf.length === 0 && <p className="text-slate-400 text-center py-8">No PPF accounts. Click + Add to get started.</p>}
          {ppf.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{a.bankOrPostOffice}{a.accountLast4 ? ` …${a.accountLast4}` : ""}</p>
                <p className="text-xs text-slate-400">{a.familyMember?.name} · Matures {formatDate(a.maturityDate)}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(a.currentBalance)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => { setEditingId(a.id); setPPFForm(f => ({ ...f, currentBalance: String(a.currentBalance / 100), annualContribution: String(a.annualContribution / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTarget({ id: a.id, type: "ppf" })} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* EPF list */}
      {subTab === "epf" && (
        <>
          <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit EPF" : "Add EPF Account"}>
            <form onSubmit={submitEPF} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editingId && <>
                <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
                  <select value={epfForm.familyMemberId} onChange={e => setEPFForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                    <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Employer Name *</label>
                  <input type="text" value={epfForm.employerName} onChange={e => setEPFForm(f => ({ ...f, employerName: e.target.value }))} required className={inputCls} />
                </div>
                <div><label className={labelCls}>UAN Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
                  <input type="text" maxLength={4} value={epfForm.uanLast4} onChange={e => setEPFForm(f => ({ ...f, uanLast4: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Employee Monthly Contrib ₹</label>
                  <input type="number" min="0" value={epfForm.monthlyEmployeeContrib} onChange={e => setEPFForm(f => ({ ...f, monthlyEmployeeContrib: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Employer Monthly Contrib ₹</label>
                  <input type="number" min="0" value={epfForm.monthlyEmployerContrib} onChange={e => setEPFForm(f => ({ ...f, monthlyEmployerContrib: e.target.value }))} className={inputCls} />
                </div>
              </>}
              <div className="sm:col-span-2"><label className={labelCls}>Current Balance ₹</label>
                <input type="number" min="0" value={epfForm.currentBalance} onChange={e => setEPFForm(f => ({ ...f, currentBalance: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
                <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
              </div>
            </form>
          </Modal>
          {epf.length === 0 && <p className="text-slate-400 text-center py-8">No EPF accounts. Click + Add to get started.</p>}
          {epf.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{a.employerName}{a.uanLast4 ? ` · UAN …${a.uanLast4}` : ""}</p>
                <p className="text-xs text-slate-400">{a.familyMember?.name}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(a.currentBalance)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => { setEditingId(a.id); setEPFForm(f => ({ ...f, currentBalance: String(a.currentBalance / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTarget({ id: a.id, type: "epf" })} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* NPS list */}
      {subTab === "nps" && (
        <>
          <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit NPS" : "Add NPS Account"}>
            <form onSubmit={submitNPS} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!editingId && <>
                <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
                  <select value={npsForm.familyMemberId} onChange={e => setNPSForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                    <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Tier</label>
                  <select value={npsForm.tier} onChange={e => setNPSForm(f => ({ ...f, tier: e.target.value }))} className={inputCls}>
                    <option value="tier1">Tier 1</option>
                    <option value="tier2">Tier 2</option>
                  </select>
                </div>
                <div><label className={labelCls}>PRAN Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
                  <input type="text" maxLength={4} value={npsForm.pranLast4} onChange={e => setNPSForm(f => ({ ...f, pranLast4: e.target.value }))} className={inputCls} />
                </div>
                <div><label className={labelCls}>Monthly Contribution ₹</label>
                  <input type="number" min="0" value={npsForm.monthlyContrib} onChange={e => setNPSForm(f => ({ ...f, monthlyContrib: e.target.value }))} className={inputCls} />
                </div>
              </>}
              <div className="sm:col-span-2"><label className={labelCls}>Current Corpus ₹</label>
                <input type="number" min="0" value={npsForm.currentCorpus} onChange={e => setNPSForm(f => ({ ...f, currentCorpus: e.target.value }))} className={inputCls} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
                <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
              </div>
            </form>
          </Modal>
          {nps.length === 0 && <p className="text-slate-400 text-center py-8">No NPS accounts. Click + Add to get started.</p>}
          {nps.map(a => (
            <div key={a.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">NPS {a.tier === "tier1" ? "Tier 1" : "Tier 2"}{a.pranLast4 ? ` · PRAN …${a.pranLast4}` : ""}</p>
                <p className="text-xs text-slate-400">{a.familyMember?.name}</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(a.currentCorpus)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => { setEditingId(a.id); setNPSForm(f => ({ ...f, currentCorpus: String(a.currentCorpus / 100), monthlyContrib: String(a.monthlyContrib / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
                <button onClick={() => setDeleteTarget({ id: a.id, type: "nps" })} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </>
      )}

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Remove Account" description="Remove this account?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTarget(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>
    </div>
  );
}

// ── Gold tab ───────────────────────────────────────────────────────────────

const GOLD_PURITIES = Object.keys(GOLD_PURITY_LABELS) as Array<keyof typeof GOLD_PURITY_LABELS>;
const GOLD_STORAGE = ["home","bank_locker","relative","other"] as const;

function GoldTab({ members }: { members: FamilyMemberResponse[] }) {
  const [holdings, setHoldings] = useState<GoldHoldingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", description: "", weightGrams: "", purity: "k22", purchaseDate: "", purchasePricePerGram: "", currentPricePerGram: "", storageLocation: "home" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHoldings((await api.get<ApiResponse<GoldHoldingResponse[]>>("/gold")).data ?? []); }
    catch { toast.error("Failed to load gold holdings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: any = { description: form.description, weightGrams: parseFloat(form.weightGrams), purity: form.purity };
    if (!editingId) { body.familyMemberId = form.familyMemberId; body.storageLocation = form.storageLocation; }
    if (form.purchaseDate) body.purchaseDate = new Date(form.purchaseDate).toISOString();
    if (form.purchasePricePerGram) body.purchasePricePerGram = parseFloat(form.purchasePricePerGram);
    if (form.currentPricePerGram) body.currentPricePerGram = parseFloat(form.currentPricePerGram);
    setSubmitting(true);
    try {
      if (editingId) { await api.put(`/gold/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/gold", body); toast.success("Added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  const totalValue = holdings.reduce((s, h) => s + h.currentValue, 0);
  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total: {formatINR(totalValue)}</p>
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Gold</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Gold Holding" : "Add Gold Holding"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>}
          <div className="sm:col-span-2"><label className={labelCls}>Description *</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className={inputCls} placeholder="Gold chain 20g" />
          </div>
          <div><label className={labelCls}>Weight (grams) *</label>
            <input type="number" min="0.001" step="0.001" value={form.weightGrams} onChange={e => setForm(f => ({ ...f, weightGrams: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Purity</label>
            <select value={form.purity} onChange={e => setForm(f => ({ ...f, purity: e.target.value }))} className={inputCls}>
              {GOLD_PURITIES.map(p => <option key={p} value={p}>{GOLD_PURITY_LABELS[p]}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Current Price/g ₹</label>
            <input type="number" min="0" value={form.currentPricePerGram} onChange={e => setForm(f => ({ ...f, currentPricePerGram: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Purchase Price/g ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.purchasePricePerGram} onChange={e => setForm(f => ({ ...f, purchasePricePerGram: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Purchase Date <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className={inputCls} />
          </div>
          {!editingId && <div><label className={labelCls}>Storage Location</label>
            <select value={form.storageLocation} onChange={e => setForm(f => ({ ...f, storageLocation: e.target.value }))} className={inputCls}>
              {GOLD_STORAGE.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
            </select>
          </div>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Gold Holding" description="Remove this gold holding?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/gold/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {holdings.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No gold holdings</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Gold</ShimmerButton></div>}
      {holdings.map(h => (
        <div key={h.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{h.description}</p>
            <p className="text-xs text-slate-400">{h.weightGrams}g · {GOLD_PURITY_LABELS[h.purity]} · {h.familyMember?.name}</p>
            {h.currentPricePerGram > 0 && <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(h.currentValue)} <span className="text-xs text-slate-400">@ {formatINR(h.currentPricePerGram)}/g</span></p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(h.id); setForm(f => ({ ...f, description: h.description, weightGrams: String(h.weightGrams), purity: h.purity, currentPricePerGram: h.currentPricePerGram > 0 ? String(h.currentPricePerGram / 100) : "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(h.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Properties tab ─────────────────────────────────────────────────────────

const PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_LABELS) as Array<keyof typeof PROPERTY_TYPE_LABELS>;

function PropertiesTab({ members }: { members: FamilyMemberResponse[] }) {
  const [props, setProps] = useState<PropertyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", propertyType: "residential_flat", description: "", areaValue: "", areaUnit: "sqft", purchaseDate: "", purchasePrice: "", currentValue: "", rentalIncome: "", registrationRefLast6: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setProps((await api.get<ApiResponse<PropertyResponse[]>>("/properties")).data ?? []); }
    catch { toast.error("Failed to load properties"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/properties/${editingId}`, {
          description: form.description,
          currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
          rentalIncome: form.rentalIncome ? parseFloat(form.rentalIncome) : undefined,
          registrationRefLast6: form.registrationRefLast6 || undefined,
        });
        toast.success("Updated");
      } else {
        const body: any = { familyMemberId: form.familyMemberId, propertyType: form.propertyType, description: form.description, areaValue: parseFloat(form.areaValue), areaUnit: form.areaUnit };
        if (form.purchaseDate) body.purchaseDate = new Date(form.purchaseDate).toISOString();
        if (form.purchasePrice) body.purchasePrice = parseFloat(form.purchasePrice);
        if (form.currentValue) body.currentValue = parseFloat(form.currentValue);
        if (form.rentalIncome) body.rentalIncome = parseFloat(form.rentalIncome);
        if (form.registrationRefLast6) body.registrationRefLast6 = form.registrationRefLast6;
        await api.post("/properties", body);
        toast.success("Property added");
      }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  const totalValue = props.reduce((s, p) => s + p.currentValue, 0);
  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total value: {formatINR(totalValue)}</p>
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Property</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Property" : "Add Property"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <>
            <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
              <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Property Type</label>
              <select value={form.propertyType} onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))} className={inputCls}>
                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Area</label>
              <div className="flex gap-2">
                <input type="number" min="0" step="0.01" value={form.areaValue} onChange={e => setForm(f => ({ ...f, areaValue: e.target.value }))} required className={inputCls} placeholder="1200" />
                <select value={form.areaUnit} onChange={e => setForm(f => ({ ...f, areaUnit: e.target.value }))} className={inputCls + " w-28"}>
                  <option>sqft</option><option>sqm</option><option>cents</option><option>acres</option>
                </select>
              </div>
            </div>
            <div><label className={labelCls}>Purchase Date <span className="text-slate-400 text-xs">(optional)</span></label>
              <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} className={inputCls} />
            </div>
            <div><label className={labelCls}>Purchase Price ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
              <input type="number" min="0" value={form.purchasePrice} onChange={e => setForm(f => ({ ...f, purchasePrice: e.target.value }))} className={inputCls} />
            </div>
          </>}
          <div className="sm:col-span-2"><label className={labelCls}>Description *</label>
            <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className={inputCls} placeholder="3BHK flat at Bandra" />
          </div>
          <div><label className={labelCls}>Current Value ₹</label>
            <input type="number" min="0" value={form.currentValue} onChange={e => setForm(f => ({ ...f, currentValue: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Rental Income ₹/mo <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.rentalIncome} onChange={e => setForm(f => ({ ...f, rentalIncome: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Reg. Ref Last 6 <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" maxLength={6} value={form.registrationRefLast6} onChange={e => setForm(f => ({ ...f, registrationRefLast6: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Property" description="Remove this property record?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/properties/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {props.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No properties</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Property</ShimmerButton></div>}
      {props.map(p => (
        <div key={p.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{p.description}</p>
            <p className="text-xs text-slate-400">{PROPERTY_TYPE_LABELS[p.propertyType]} · {p.areaValue} {p.areaUnit} · {p.familyMember?.name}</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(p.currentValue)}{p.rentalIncome > 0 ? ` · Rent ${formatINR(p.rentalIncome)}/mo` : ""}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(p.id); setForm(f => ({ ...f, description: p.description, currentValue: p.currentValue > 0 ? String(p.currentValue / 100) : "", rentalIncome: p.rentalIncome > 0 ? String(p.rentalIncome / 100) : "", registrationRefLast6: p.registrationRefLast6 ?? "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(p.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Post Office tab ────────────────────────────────────────────────────────

const PO_TYPES = Object.keys(POST_OFFICE_SCHEME_LABELS) as Array<keyof typeof POST_OFFICE_SCHEME_LABELS>;

function PostOfficeTab({ members }: { members: FamilyMemberResponse[] }) {
  const [schemes, setSchemes] = useState<PostOfficeSchemeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", schemeType: "nsc", certificateLast4: "", amount: "", interestRate: "", purchaseDate: "", maturityDate: "", maturityAmount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setSchemes((await api.get<ApiResponse<PostOfficeSchemeResponse[]>>("/post-office-schemes")).data ?? []); }
    catch { toast.error("Failed to load post office schemes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: any = { schemeType: form.schemeType, amount: parseFloat(form.amount), interestRate: parseFloat(form.interestRate), purchaseDate: new Date(form.purchaseDate).toISOString(), maturityDate: new Date(form.maturityDate).toISOString(), maturityAmount: parseFloat(form.maturityAmount) };
      if (form.certificateLast4.length === 4) body.certificateLast4 = form.certificateLast4;
      if (!editingId) body.familyMemberId = form.familyMemberId;
      if (editingId) { await api.put(`/post-office-schemes/${editingId}`, body); toast.success("Updated"); }
      else { await api.post("/post-office-schemes", body); toast.success("Added"); }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Scheme</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Scheme" : "Add Post Office Scheme"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>}
          <div><label className={labelCls}>Scheme Type</label>
            <select value={form.schemeType} onChange={e => setForm(f => ({ ...f, schemeType: e.target.value }))} className={inputCls}>
              {PO_TYPES.map(t => <option key={t} value={t}>{POST_OFFICE_SCHEME_LABELS[t]}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Certificate Last 4 <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="text" maxLength={4} value={form.certificateLast4} onChange={e => setForm(f => ({ ...f, certificateLast4: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Principal Amount ₹ *</label>
            <input type="number" min="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Interest Rate % *</label>
            <input type="number" min="0" step="0.01" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Purchase Date *</label>
            <input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Maturity Date *</label>
            <input type="date" value={form.maturityDate} onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))} required className={inputCls} />
          </div>
          <div className="sm:col-span-2"><label className={labelCls}>Maturity Amount ₹ *</label>
            <input type="number" min="1" value={form.maturityAmount} onChange={e => setForm(f => ({ ...f, maturityAmount: e.target.value }))} required className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Scheme" description="Remove this scheme?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/post-office-schemes/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {schemes.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No post office schemes</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Scheme</ShimmerButton></div>}
      {schemes.map(s => (
        <div key={s.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{POST_OFFICE_SCHEME_LABELS[s.schemeType]}{s.certificateLast4 ? ` …${s.certificateLast4}` : ""}</p>
            <p className="text-xs text-slate-400">{s.familyMember?.name} · {s.interestRate}% p.a. · Matures {formatDate(s.maturityDate)}</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatINR(s.amount)} → {formatINR(s.maturityAmount)}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(s.id); setForm(f => ({ ...f, schemeType: s.schemeType, certificateLast4: s.certificateLast4 ?? "", amount: String(s.amount / 100), interestRate: String(s.interestRate), purchaseDate: s.purchaseDate.slice(0, 10), maturityDate: s.maturityDate.slice(0, 10), maturityAmount: String(s.maturityAmount / 100) })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(s.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── SGB tab ────────────────────────────────────────────────────────────────

function SGBTab({ members }: { members: FamilyMemberResponse[] }) {
  const [holdings, setHoldings] = useState<SGBHoldingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", seriesName: "", units: "", issuePrice: "", currentPrice: "", issueDate: "", maturityDate: "", interestRate: "2.5" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setHoldings((await api.get<ApiResponse<SGBHoldingResponse[]>>("/sgb")).data ?? []); }
    catch { toast.error("Failed to load SGB holdings"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/sgb/${editingId}`, { seriesName: form.seriesName, units: parseFloat(form.units), currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : undefined });
        toast.success("Updated");
      } else {
        await api.post("/sgb", { familyMemberId: form.familyMemberId, seriesName: form.seriesName, units: parseFloat(form.units), issuePrice: parseFloat(form.issuePrice), currentPrice: form.currentPrice ? parseFloat(form.currentPrice) : undefined, issueDate: new Date(form.issueDate).toISOString(), maturityDate: new Date(form.maturityDate).toISOString(), interestRate: parseFloat(form.interestRate) });
        toast.success("SGB holding added");
      }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add SGB</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit SGB" : "Add SGB Holding"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
            <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
              <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>}
          <div className="sm:col-span-2"><label className={labelCls}>Series Name *</label>
            <input type="text" value={form.seriesName} onChange={e => setForm(f => ({ ...f, seriesName: e.target.value }))} required className={inputCls} placeholder="SGB 2023-24 Series IV" />
          </div>
          <div><label className={labelCls}>Units (grams) *</label>
            <input type="number" min="0.001" step="0.001" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} required className={inputCls} />
          </div>
          {!editingId && <div><label className={labelCls}>Issue Price ₹/gram *</label>
            <input type="number" min="1" value={form.issuePrice} onChange={e => setForm(f => ({ ...f, issuePrice: e.target.value }))} required className={inputCls} />
          </div>}
          <div><label className={labelCls}>Current Price ₹/gram</label>
            <input type="number" min="0" value={form.currentPrice} onChange={e => setForm(f => ({ ...f, currentPrice: e.target.value }))} className={inputCls} />
          </div>
          {!editingId && <>
            <div><label className={labelCls}>Issue Date *</label>
              <input type="date" value={form.issueDate} onChange={e => setForm(f => ({ ...f, issueDate: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Maturity Date *</label>
              <input type="date" value={form.maturityDate} onChange={e => setForm(f => ({ ...f, maturityDate: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Interest Rate %</label>
              <input type="number" min="0" step="0.1" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))} className={inputCls} />
            </div>
          </>}
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove SGB" description="Remove this SGB holding?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/sgb/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {holdings.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No SGB holdings</p><ShimmerButton onClick={() => setShowAdd(true)}>Add SGB</ShimmerButton></div>}
      {holdings.map(h => (
        <div key={h.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{h.seriesName}</p>
            <p className="text-xs text-slate-400">{h.units}g · {h.interestRate}% p.a. · {h.familyMember?.name} · Matures {formatDate(h.maturityDate)}</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{h.currentPrice > 0 ? formatINR(h.currentValue) : formatINR(h.investedPaise)} {h.currentPrice > 0 ? `@ ₹${(h.currentPrice / 100).toLocaleString("en-IN")}/g` : "(issue price)"}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button onClick={() => { setEditingId(h.id); setForm(f => ({ ...f, seriesName: h.seriesName, units: String(h.units), currentPrice: h.currentPrice > 0 ? String(h.currentPrice / 100) : "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
            <button onClick={() => setDeleteTargetId(h.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Chit Funds tab ─────────────────────────────────────────────────────────

function ChitFundsTab({ members }: { members: FamilyMemberResponse[] }) {
  const [funds, setFunds] = useState<ChitFundResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ familyMemberId: "", organizerName: "", totalValue: "", monthlyContrib: "", durationMonths: "", startDate: "", endDate: "", monthWon: "", prizeReceived: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setFunds((await api.get<ApiResponse<ChitFundResponse[]>>("/chit-funds")).data ?? []); }
    catch { toast.error("Failed to load chit funds"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/chit-funds/${editingId}`, {
          organizerName: form.organizerName,
          monthlyContrib: form.monthlyContrib ? parseFloat(form.monthlyContrib) : undefined,
          monthWon: form.monthWon ? parseInt(form.monthWon) : null,
          prizeReceived: form.prizeReceived ? parseFloat(form.prizeReceived) : null,
        });
        toast.success("Updated");
      } else {
        await api.post("/chit-funds", {
          familyMemberId: form.familyMemberId, organizerName: form.organizerName,
          totalValue: parseFloat(form.totalValue), monthlyContrib: parseFloat(form.monthlyContrib),
          durationMonths: parseInt(form.durationMonths), startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString(),
          ...(form.monthWon && { monthWon: parseInt(form.monthWon) }),
          ...(form.prizeReceived && { prizeReceived: parseFloat(form.prizeReceived) }),
        });
        toast.success("Added");
      }
      setShowAdd(false); setEditingId(null); await load();
    } catch { toast.error("Failed"); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="space-y-3">{[0,1].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ShimmerButton onClick={() => { setEditingId(null); setShowAdd(true); }}>+ Add Chit Fund</ShimmerButton>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditingId(null); }} title={editingId ? "Edit Chit Fund" : "Add Chit Fund"}>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!editingId && <>
            <div className="sm:col-span-2"><label className={labelCls}>Family Member *</label>
              <select value={form.familyMemberId} onChange={e => setForm(f => ({ ...f, familyMemberId: e.target.value }))} required className={inputCls}>
                <option value="">Select…</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Total Chit Value ₹ *</label>
              <input type="number" min="1" value={form.totalValue} onChange={e => setForm(f => ({ ...f, totalValue: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Duration (months) *</label>
              <input type="number" min="1" value={form.durationMonths} onChange={e => setForm(f => ({ ...f, durationMonths: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>Start Date *</label>
              <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required className={inputCls} />
            </div>
            <div><label className={labelCls}>End Date *</label>
              <input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required className={inputCls} />
            </div>
          </>}
          <div className="sm:col-span-2"><label className={labelCls}>Organizer Name *</label>
            <input type="text" value={form.organizerName} onChange={e => setForm(f => ({ ...f, organizerName: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Monthly Contribution ₹ *</label>
            <input type="number" min="1" value={form.monthlyContrib} onChange={e => setForm(f => ({ ...f, monthlyContrib: e.target.value }))} required className={inputCls} />
          </div>
          <div><label className={labelCls}>Month Won <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="1" value={form.monthWon} onChange={e => setForm(f => ({ ...f, monthWon: e.target.value }))} className={inputCls} />
          </div>
          <div><label className={labelCls}>Prize Received ₹ <span className="text-slate-400 text-xs">(optional)</span></label>
            <input type="number" min="0" value={form.prizeReceived} onChange={e => setForm(f => ({ ...f, prizeReceived: e.target.value }))} className={inputCls} />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
            <ShimmerButton type="submit" disabled={submitting}>{submitting ? "Saving…" : editingId ? "Save" : "Add"}</ShimmerButton>
          </div>
        </form>
      </Modal>

      <Modal open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Remove Chit Fund" description="Remove this chit fund?">
        <div className="flex justify-end gap-3">
          <button onClick={() => setDeleteTargetId(null)} className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300">Cancel</button>
          <button onClick={async () => { await api.delete(`/chit-funds/${deleteTargetId}`); toast.success("Removed"); setDeleteTargetId(null); await load(); }} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
        </div>
      </Modal>

      {funds.length === 0 && <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700"><p className="text-slate-500 dark:text-slate-400 mb-2">No chit funds</p><ShimmerButton onClick={() => setShowAdd(true)}>Add Chit Fund</ShimmerButton></div>}
      {funds.map(f => {
        const months = Math.ceil(Math.min(1, (Date.now() - new Date(f.startDate).getTime()) / (new Date(f.endDate).getTime() - new Date(f.startDate).getTime())) * f.durationMonths);
        const contributed = Math.min(months, f.durationMonths) * f.monthlyContrib;
        return (
          <div key={f.id} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{f.organizerName}</p>
                {f.monthWon && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Won Month {f.monthWon}</span>}
              </div>
              <p className="text-xs text-slate-400">{f.familyMember?.name} · {formatINR(f.monthlyContrib)}/mo × {f.durationMonths} months</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">Contributed: {formatINR(contributed)} of {formatINR(f.totalValue)}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => { setEditingId(f.id); setForm(s => ({ ...s, organizerName: f.organizerName, monthlyContrib: String(f.monthlyContrib / 100), monthWon: f.monthWon ? String(f.monthWon) : "", prizeReceived: f.prizeReceived ? String(f.prizeReceived / 100) : "" })); setShowAdd(true); }} className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">Edit</button>
              <button onClick={() => setDeleteTargetId(f.id)} className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500">Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main InvestmentsPage ───────────────────────────────────────────────────

function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("mf");
  const [summary, setSummary] = useState<InvestmentSummary | null>(null);
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<ApiResponse<InvestmentSummary>>("/investments/summary"),
      api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
    ]).then(([s, m]) => {
      setSummary(s.data ?? null);
      setMembers(m.data ?? []);
    }).catch(() => toast.error("Failed to load")).finally(() => setSummaryLoading(false));
  }, []);

  const tabContent: Record<Tab, React.ReactNode> = {
    mf: <MFTab members={members} />,
    ppf_epf_nps: <PPFEPFNPSTab members={members} />,
    gold: <GoldTab members={members} />,
    properties: <PropertiesTab members={members} />,
    post_office: <PostOfficeTab members={members} />,
    sgb: <SGBTab members={members} />,
    chit_funds: <ChitFundsTab members={members} />,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Investments</h1>

      {/* Summary cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Total Invested</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(summary.total.invested)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">MF Invested</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(summary.mutualFunds.invested)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">PPF + EPF + NPS</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatINR(summary.ppf.balance + summary.epf.balance + summary.nps.corpus)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
            <p className="text-xs text-slate-400">Gold</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{summary.gold.weightGrams.toFixed(2)}g · {formatINR(summary.gold.currentValue)}</p>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 flex-wrap rounded-lg border border-slate-200 dark:border-slate-700 p-1 bg-slate-50 dark:bg-slate-800 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.key ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {tabContent[activeTab]}
    </div>
  );
}

export default InvestmentsPage;
