import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, daysUntil } from "@/utils/format";
import toast from "react-hot-toast";
import type {
  ApiResponse,
  LoanResponse,
  FamilyMemberResponse,
  LoanType,
} from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  home: "Home",
  car: "Car",
  personal: "Personal",
  education: "Education",
  gold: "Gold",
  other: "Other",
};

const LOAN_TYPE_COLORS: Record<LoanType, string> = {
  home: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  car: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  personal: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  education: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

interface AddFormState {
  familyMemberId: string;
  lenderName: string;
  loanType: LoanType;
  principalAmount: string;
  outstandingAmount: string;
  emiAmount: string;
  interestRate: string;
  tenureMonths: string;
  startDate: string;
  endDate: string;
  emiDueDate: string;
}

interface EditFormState {
  lenderName: string;
  loanType: LoanType;
  principalAmount: string;
  outstandingAmount: string;
  emiAmount: string;
  interestRate: string;
  tenureMonths: string;
  startDate: string;
  endDate: string;
  emiDueDate: string;
}

const defaultAddForm: AddFormState = {
  familyMemberId: "",
  lenderName: "",
  loanType: "home",
  principalAmount: "",
  outstandingAmount: "",
  emiAmount: "",
  interestRate: "",
  tenureMonths: "",
  startDate: "",
  endDate: "",
  emiDueDate: "1",
};

const defaultEditForm: EditFormState = {
  lenderName: "",
  loanType: "home",
  principalAmount: "",
  outstandingAmount: "",
  emiAmount: "",
  interestRate: "",
  tenureMonths: "",
  startDate: "",
  endDate: "",
  emiDueDate: "1",
};

function parsePaiseToRupees(paise: string): string {
  return (Number(paise) / 100).toFixed(0);
}

const inputCls =
  "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";
const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

function LoansPage() {
  const [loans, setLoans] = useState<LoanResponse[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(defaultAddForm);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(defaultEditForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [loansRes, membersRes] = await Promise.all([
        api.get<ApiResponse<LoanResponse[]>>("/loans"),
        api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
      ]);
      setLoans(loansRes.data ?? []);
      setFamilyMembers(membersRes.data ?? []);
    } catch {
      toast.error("Failed to load loans");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.familyMemberId) {
      toast.error("Please select a family member");
      return;
    }

    const principalNum = parseFloat(addForm.principalAmount);
    const outstandingNum = parseFloat(addForm.outstandingAmount);
    const emiNum = parseFloat(addForm.emiAmount);
    const interestNum = parseFloat(addForm.interestRate);
    const tenureNum = parseInt(addForm.tenureMonths, 10);
    const emiDueDateNum = parseInt(addForm.emiDueDate, 10);

    if (isNaN(principalNum) || principalNum <= 0) {
      toast.error("Please enter a valid principal amount");
      return;
    }
    if (isNaN(outstandingNum) || outstandingNum < 0) {
      toast.error("Please enter a valid outstanding amount");
      return;
    }
    if (isNaN(emiNum) || emiNum <= 0) {
      toast.error("Please enter a valid EMI amount");
      return;
    }
    if (isNaN(interestNum) || interestNum < 0) {
      toast.error("Please enter a valid interest rate");
      return;
    }
    if (isNaN(tenureNum) || tenureNum <= 0) {
      toast.error("Please enter a valid tenure");
      return;
    }

    setAddSubmitting(true);
    try {
      await api.post<ApiResponse<LoanResponse>>("/loans", {
        familyMemberId: addForm.familyMemberId,
        lenderName: addForm.lenderName,
        loanType: addForm.loanType,
        principalAmount: principalNum,
        outstandingAmount: outstandingNum,
        emiAmount: emiNum,
        interestRate: interestNum,
        tenureMonths: tenureNum,
        startDate: new Date(addForm.startDate).toISOString(),
        endDate: addForm.endDate ? new Date(addForm.endDate).toISOString() : undefined,
        emiDueDate: emiDueDateNum,
      });
      toast.success("Loan added successfully");
      setShowAddForm(false);
      setAddForm(defaultAddForm);
      await fetchData();
    } catch {
      toast.error("Failed to add loan");
    } finally {
      setAddSubmitting(false);
    }
  }

  function startEdit(loan: LoanResponse) {
    setEditingId(loan.id);
    setEditForm({
      lenderName: loan.lenderName,
      loanType: loan.loanType,
      principalAmount: parsePaiseToRupees(loan.principalAmount),
      outstandingAmount: parsePaiseToRupees(loan.outstandingAmount),
      emiAmount: parsePaiseToRupees(loan.emiAmount),
      interestRate: String(loan.interestRate),
      tenureMonths: String(loan.tenureMonths),
      startDate: loan.startDate.split("T")[0],
      endDate: loan.endDate ? loan.endDate.split("T")[0] : "",
      emiDueDate: String(loan.emiDueDate),
    });
  }

  async function handleEdit(e: React.FormEvent, loanId: string) {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await api.put<ApiResponse<LoanResponse>>(`/loans/${loanId}`, {
        lenderName: editForm.lenderName,
        loanType: editForm.loanType,
        principalAmount: parseFloat(editForm.principalAmount),
        outstandingAmount: parseFloat(editForm.outstandingAmount),
        emiAmount: parseFloat(editForm.emiAmount),
        interestRate: parseFloat(editForm.interestRate),
        tenureMonths: parseInt(editForm.tenureMonths, 10),
        startDate: new Date(editForm.startDate).toISOString(),
        endDate: editForm.endDate
          ? new Date(editForm.endDate).toISOString()
          : undefined,
        emiDueDate: parseInt(editForm.emiDueDate, 10),
      });
      toast.success("Loan updated");
      setEditingId(null);
      await fetchData();
    } catch {
      toast.error("Failed to update loan");
    } finally {
      setEditSubmitting(false);
    }
  }

  function openDeleteConfirm(id: string, name: string) {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setConfirmDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try {
      await api.delete<ApiResponse<unknown>>(`/loans/${deleteTargetId}`);
      toast.success("Loan deleted");
      setConfirmDeleteOpen(false);
      setDeleteTargetId(null);
      await fetchData();
    } catch {
      toast.error("Failed to delete loan");
    }
  }

  // Group loans by family member
  const grouped = loans.reduce<Record<string, LoanResponse[]>>((acc, loan) => {
    const memberName = loan.familyMember?.name ?? "Unknown";
    if (!acc[memberName]) acc[memberName] = [];
    acc[memberName].push(loan);
    return acc;
  }, {});

  function paidPercent(loan: LoanResponse): number {
    const principal = Number(loan.principalAmount);
    const outstanding = Number(loan.outstandingAmount);
    if (principal <= 0) return 0;
    return Math.min(100, Math.max(0, ((principal - outstanding) / principal) * 100));
  }

  const emiDueDates = Array.from({ length: 31 }, (_, i) => i + 1);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Loans</h1>
        <ShimmerButton onClick={() => setShowAddForm(true)}>+ Add Loan</ShimmerButton>
      </div>

      {/* Add Modal */}
      <Modal
        open={showAddForm}
        onClose={() => { setShowAddForm(false); setAddForm(defaultAddForm); }}
        title="Add Loan"
      >
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Family Member <span className="text-red-400">*</span></label>
            <select value={addForm.familyMemberId}
              onChange={(e) => setAddForm((f) => ({ ...f, familyMemberId: e.target.value }))}
              required className={inputCls}>
              <option value="">Select member…</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Lender Name <span className="text-red-400">*</span></label>
            <input type="text" value={addForm.lenderName}
              onChange={(e) => setAddForm((f) => ({ ...f, lenderName: e.target.value }))}
              placeholder="e.g. HDFC Bank" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Loan Type <span className="text-red-400">*</span></label>
            <select value={addForm.loanType}
              onChange={(e) => setAddForm((f) => ({ ...f, loanType: e.target.value as LoanType }))}
              className={inputCls}>
              {(Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((t) => (
                <option key={t} value={t}>{LOAN_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Principal Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="1" step="1" value={addForm.principalAmount}
              onChange={(e) => setAddForm((f) => ({ ...f, principalAmount: e.target.value }))}
              placeholder="0" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Outstanding Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="1" value={addForm.outstandingAmount}
              onChange={(e) => setAddForm((f) => ({ ...f, outstandingAmount: e.target.value }))}
              placeholder="0" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>EMI Amount (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="1" step="1" value={addForm.emiAmount}
              onChange={(e) => setAddForm((f) => ({ ...f, emiAmount: e.target.value }))}
              placeholder="0" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Interest Rate (%) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="0.01" value={addForm.interestRate}
              onChange={(e) => setAddForm((f) => ({ ...f, interestRate: e.target.value }))}
              placeholder="8.5" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Tenure (months) <span className="text-red-400">*</span></label>
            <input type="number" min="1" step="1" value={addForm.tenureMonths}
              onChange={(e) => setAddForm((f) => ({ ...f, tenureMonths: e.target.value }))}
              placeholder="240" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Start Date <span className="text-red-400">*</span></label>
            <input type="date" value={addForm.startDate}
              onChange={(e) => setAddForm((f) => ({ ...f, startDate: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>End Date <span className="text-xs text-slate-400">(optional)</span></label>
            <input type="date" value={addForm.endDate}
              onChange={(e) => setAddForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>EMI Due Date <span className="text-red-400">*</span></label>
            <select value={addForm.emiDueDate}
              onChange={(e) => setAddForm((f) => ({ ...f, emiDueDate: e.target.value }))}
              className={inputCls}>
              {emiDueDates.map((d) => (
                <option key={d} value={d}>
                  {d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"} of every month
                </option>
              ))}
            </select>
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowAddForm(false); setAddForm(defaultAddForm); }}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
              Cancel
            </button>
            <ShimmerButton type="submit" disabled={addSubmitting}>
              {addSubmitting ? "Adding…" : "Add Loan"}
            </ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        title="Edit Loan"
      >
        <form onSubmit={(e) => editingId && handleEdit(e, editingId)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Lender Name</label>
            <input type="text" value={editForm.lenderName}
              onChange={(e) => setEditForm((f) => ({ ...f, lenderName: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Loan Type</label>
            <select value={editForm.loanType}
              onChange={(e) => setEditForm((f) => ({ ...f, loanType: e.target.value as LoanType }))}
              className={inputCls}>
              {(Object.keys(LOAN_TYPE_LABELS) as LoanType[]).map((t) => (
                <option key={t} value={t}>{LOAN_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Principal Amount (₹)</label>
            <input type="number" min="1" step="1" value={editForm.principalAmount}
              onChange={(e) => setEditForm((f) => ({ ...f, principalAmount: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Outstanding Amount (₹)</label>
            <input type="number" min="0" step="1" value={editForm.outstandingAmount}
              onChange={(e) => setEditForm((f) => ({ ...f, outstandingAmount: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>EMI Amount (₹)</label>
            <input type="number" min="1" step="1" value={editForm.emiAmount}
              onChange={(e) => setEditForm((f) => ({ ...f, emiAmount: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Interest Rate (%)</label>
            <input type="number" min="0" step="0.01" value={editForm.interestRate}
              onChange={(e) => setEditForm((f) => ({ ...f, interestRate: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Tenure (months)</label>
            <input type="number" min="1" step="1" value={editForm.tenureMonths}
              onChange={(e) => setEditForm((f) => ({ ...f, tenureMonths: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>EMI Due Date</label>
            <select value={editForm.emiDueDate}
              onChange={(e) => setEditForm((f) => ({ ...f, emiDueDate: e.target.value }))}
              className={inputCls}>
              {emiDueDates.map((d) => (
                <option key={d} value={d}>
                  {d}{d === 1 ? "st" : d === 2 ? "nd" : d === 3 ? "rd" : "th"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" value={editForm.startDate}
              onChange={(e) => setEditForm((f) => ({ ...f, startDate: e.target.value }))}
              required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>End Date <span className="text-xs text-slate-400">(optional)</span></label>
            <input type="date" value={editForm.endDate}
              onChange={(e) => setEditForm((f) => ({ ...f, endDate: e.target.value }))}
              className={inputCls} />
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditingId(null)}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
              Cancel
            </button>
            <ShimmerButton type="submit" disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save"}
            </ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Delete Loan"
        description={`This will permanently remove the ${deleteTargetName} loan. This cannot be undone.`}
      >
        <div className="flex justify-end gap-3">
          <button onClick={() => setConfirmDeleteOpen(false)}
            className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
            Cancel
          </button>
          <button onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </Modal>

      {/* Empty State */}
      {loans.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No loans yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
            Add your first loan to start tracking EMIs and outstanding amounts
          </p>
          <ShimmerButton onClick={() => setShowAddForm(true)}>Add Loan</ShimmerButton>
        </div>
      )}

      {/* Grouped Loan List */}
      {Object.entries(grouped).map(([memberName, memberLoans]) => (
        <div key={memberName} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1">
            {memberName}
          </h2>

          {memberLoans.map((loan) => {
            const paid = paidPercent(loan);
            const emiDue = daysUntil(loan.emiDueDate);

            return (
              <div
                key={loan.id}
                className={cn(
                  "rounded-xl border p-4",
                  "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {loan.lenderName}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${LOAN_TYPE_COLORS[loan.loanType]}`}>
                        {LOAN_TYPE_LABELS[loan.loanType]}
                      </span>
                    </div>

                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {formatINR(loan.outstandingAmount)}
                      </span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        outstanding of{" "}
                        <span className="text-slate-700 dark:text-slate-300">
                          {formatINR(loan.principalAmount)}
                        </span>
                      </span>
                    </div>

                    <div className="w-full">
                      <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
                        <span>{paid.toFixed(1)}% paid</span>
                        <span>{(100 - paid).toFixed(1)}% remaining</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-ocean-accent transition-all"
                          style={{ width: `${paid}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap text-sm">
                      <span className="text-slate-600 dark:text-slate-300">
                        EMI:{" "}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {formatINR(loan.emiAmount)}
                        </span>
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {loan.interestRate}% p.a.
                      </span>
                      <span className={`text-xs font-medium ${
                        emiDue.days <= 3
                          ? "text-red-600 dark:text-red-400"
                          : emiDue.days <= 7
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-400 dark:text-slate-500"
                      }`}>
                        Next EMI: {emiDue.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(loan)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(loan.id, loan.lenderName)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default LoansPage;
