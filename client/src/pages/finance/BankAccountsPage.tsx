import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, balanceStaleness, formatDate } from "@/utils/format";
import toast from "react-hot-toast";
import type {
  ApiResponse,
  FamilyMemberResponse,
  BankAccountResponse,
  FixedDepositResponse,
  FDStatus,
} from "@diary/shared";
import { INDIAN_BANKS, calculateFDMaturityAmount, calculateFDTenureMonths } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";

interface AddFormState {
  familyMemberId: string;
  bankName: string;
  accountType: "savings" | "current";
  accountNumberLast4: string;
  ifscCode: string;
  balance: string;
}

interface EditFormState {
  bankName: string;
  accountType: "savings" | "current";
  accountNumberLast4: string;
  ifscCode: string;
  balance: string;
}

interface FDFormState {
  fdReferenceNumberLast4: string;
  principalAmount: string;
  interestRate: string;
  startDate: string;
  maturityDate: string;
  autoRenewal: boolean;
  status: FDStatus;
}

const defaultAddForm: AddFormState = {
  familyMemberId: "",
  bankName: INDIAN_BANKS[0],
  accountType: "savings",
  accountNumberLast4: "",
  ifscCode: "",
  balance: "",
};

const defaultEditForm: EditFormState = {
  bankName: INDIAN_BANKS[0],
  accountType: "savings",
  accountNumberLast4: "",
  ifscCode: "",
  balance: "",
};

const defaultFDForm: FDFormState = {
  fdReferenceNumberLast4: "",
  principalAmount: "",
  interestRate: "",
  startDate: "",
  maturityDate: "",
  autoRenewal: false,
  status: "active",
};

const inputCls =
  "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent dark:focus:border-ocean-accent";

function FDFormFields({
  form,
  onChange,
}: {
  form: FDFormState;
  onChange: (f: FDFormState) => void;
}) {
  const preview = (() => {
    const principal = parseFloat(form.principalAmount);
    const rate = parseFloat(form.interestRate);
    if (!principal || !rate || !form.startDate || !form.maturityDate) return null;
    const start = new Date(form.startDate);
    const maturity = new Date(form.maturityDate);
    if (isNaN(start.getTime()) || isNaN(maturity.getTime()) || maturity <= start) return null;
    return {
      amount: calculateFDMaturityAmount(principal, rate, start, maturity),
      months: calculateFDTenureMonths(start, maturity),
    };
  })();

  return (
    <>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          FD Reference (last 4 digits){" "}
          <span className="text-slate-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          maxLength={4}
          value={form.fdReferenceNumberLast4}
          onChange={(e) =>
            onChange({ ...form, fdReferenceNumberLast4: e.target.value.replace(/\D/g, "") })
          }
          placeholder="4521"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value as FDStatus })}
          className={inputCls}
        >
          <option value="active">Active</option>
          <option value="matured">Matured</option>
          <option value="broken">Broken</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Principal Amount (₹) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="1"
          required
          value={form.principalAmount}
          onChange={(e) => onChange({ ...form, principalAmount: e.target.value })}
          placeholder="200000"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Annual Interest Rate (%) <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          required
          value={form.interestRate}
          onChange={(e) => onChange({ ...form, interestRate: e.target.value })}
          placeholder="7.1"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Start Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          required
          value={form.startDate}
          onChange={(e) => onChange({ ...form, startDate: e.target.value })}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Maturity Date <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          required
          value={form.maturityDate}
          onChange={(e) => onChange({ ...form, maturityDate: e.target.value })}
          className={inputCls}
        />
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.autoRenewal}
            onChange={(e) => onChange({ ...form, autoRenewal: e.target.checked })}
            className="rounded border-slate-300 dark:border-white/10"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Auto-renewal on maturity
          </span>
        </label>
      </div>

      {preview && (
        <div className="sm:col-span-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wide mb-1">
            Projected (quarterly compounding)
          </p>
          <p className="text-base font-bold text-emerald-800 dark:text-emerald-300">
            Maturity Amount: ₹{preview.amount.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
            Tenure: {preview.months} months
          </p>
        </div>
      )}
    </>
  );
}

function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccountResponse[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(defaultAddForm);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(defaultEditForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete confirm state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // FD state
  const [addFDBankAccountId, setAddFDBankAccountId] = useState<string | null>(null);
  const [fdForm, setFDForm] = useState<FDFormState>(defaultFDForm);
  const [fdSubmitting, setFDSubmitting] = useState(false);
  const [editingFDId, setEditingFDId] = useState<string | null>(null);
  const [editFDForm, setEditFDForm] = useState<FDFormState>(defaultFDForm);
  const [deleteFDTargetId, setDeleteFDTargetId] = useState<string | null>(null);
  const [confirmDeleteFDOpen, setConfirmDeleteFDOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [accountsRes, membersRes] = await Promise.all([
        api.get<ApiResponse<BankAccountResponse[]>>("/bank-accounts"),
        api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
      ]);
      setAccounts(accountsRes.data ?? []);
      setFamilyMembers(membersRes.data ?? []);
    } catch {
      toast.error("Failed to load bank accounts");
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
    if (!addForm.accountNumberLast4 || addForm.accountNumberLast4.length > 4) {
      toast.error("Last 4 digits must be 1-4 characters");
      return;
    }
    const balanceNum = parseFloat(addForm.balance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      toast.error("Please enter a valid balance");
      return;
    }

    setAddSubmitting(true);
    try {
      await api.post<ApiResponse<BankAccountResponse>>("/bank-accounts", {
        familyMemberId: addForm.familyMemberId,
        bankName: addForm.bankName,
        accountType: addForm.accountType,
        accountNumberLast4: addForm.accountNumberLast4,
        ifscCode: addForm.ifscCode || undefined,
        balance: balanceNum,
      });
      toast.success("Account added successfully");
      setShowAddForm(false);
      setAddForm(defaultAddForm);
      await fetchData();
    } catch {
      toast.error("Failed to add account");
    } finally {
      setAddSubmitting(false);
    }
  }

  function startEdit(account: BankAccountResponse) {
    setEditingId(account.id);
    setEditForm({
      bankName: account.bankName,
      accountType: account.accountType,
      accountNumberLast4: account.accountNumberLast4,
      ifscCode: account.ifscCode ?? "",
      balance: (Number(account.balance) / 100).toFixed(0),
    });
  }

  async function handleEdit(e: React.FormEvent, accountId: string) {
    e.preventDefault();
    const balanceNum = parseFloat(editForm.balance);
    if (isNaN(balanceNum) || balanceNum < 0) {
      toast.error("Please enter a valid balance");
      return;
    }
    setEditSubmitting(true);
    try {
      await api.put<ApiResponse<BankAccountResponse>>(
        `/bank-accounts/${accountId}`,
        {
          bankName: editForm.bankName,
          accountType: editForm.accountType,
          accountNumberLast4: editForm.accountNumberLast4,
          ifscCode: editForm.ifscCode || undefined,
          balance: balanceNum,
        }
      );
      toast.success("Account updated");
      setEditingId(null);
      await fetchData();
    } catch {
      toast.error("Failed to update account");
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
      await api.delete<ApiResponse<unknown>>(`/bank-accounts/${deleteTargetId}`);
      toast.success("Account deleted");
      setConfirmDeleteOpen(false);
      setDeleteTargetId(null);
      await fetchData();
    } catch {
      toast.error("Failed to delete account");
    }
  }

  async function handleAddFD(e: React.FormEvent) {
    e.preventDefault();
    if (!addFDBankAccountId) return;
    const principal = parseFloat(fdForm.principalAmount);
    const rate = parseFloat(fdForm.interestRate);
    if (isNaN(principal) || principal <= 0) {
      toast.error("Enter a valid principal amount");
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      toast.error("Enter a valid interest rate");
      return;
    }
    if (!fdForm.startDate || !fdForm.maturityDate) {
      toast.error("Enter both start and maturity dates");
      return;
    }
    if (new Date(fdForm.maturityDate) <= new Date(fdForm.startDate)) {
      toast.error("Maturity date must be after start date");
      return;
    }
    setFDSubmitting(true);
    try {
      await api.post("/fixed-deposits", {
        bankAccountId: addFDBankAccountId,
        fdReferenceNumberLast4: fdForm.fdReferenceNumberLast4 || undefined,
        principalAmount: principal,
        interestRate: rate,
        startDate: fdForm.startDate,
        maturityDate: fdForm.maturityDate,
        autoRenewal: fdForm.autoRenewal,
        status: fdForm.status,
      });
      toast.success("Fixed deposit added");
      setAddFDBankAccountId(null);
      setFDForm(defaultFDForm);
      await fetchData();
    } catch {
      toast.error("Failed to add fixed deposit");
    } finally {
      setFDSubmitting(false);
    }
  }

  function startEditFD(fd: FixedDepositResponse) {
    setEditingFDId(fd.id);
    setEditFDForm({
      fdReferenceNumberLast4: fd.fdReferenceNumberLast4 ?? "",
      principalAmount: (Number(fd.principalAmount) / 100).toFixed(0),
      interestRate: fd.interestRate.toString(),
      startDate: fd.startDate.slice(0, 10),
      maturityDate: fd.maturityDate.slice(0, 10),
      autoRenewal: fd.autoRenewal,
      status: fd.status,
    });
  }

  async function handleEditFD(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFDId) return;
    const principal = parseFloat(editFDForm.principalAmount);
    const rate = parseFloat(editFDForm.interestRate);
    if (isNaN(principal) || principal <= 0) {
      toast.error("Enter a valid principal amount");
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      toast.error("Enter a valid interest rate");
      return;
    }
    setFDSubmitting(true);
    try {
      await api.put(`/fixed-deposits/${editingFDId}`, {
        fdReferenceNumberLast4: editFDForm.fdReferenceNumberLast4 || undefined,
        principalAmount: principal,
        interestRate: rate,
        startDate: editFDForm.startDate,
        maturityDate: editFDForm.maturityDate,
        autoRenewal: editFDForm.autoRenewal,
        status: editFDForm.status,
      });
      toast.success("Fixed deposit updated");
      setEditingFDId(null);
      await fetchData();
    } catch {
      toast.error("Failed to update fixed deposit");
    } finally {
      setFDSubmitting(false);
    }
  }

  async function handleDeleteFD() {
    if (!deleteFDTargetId) return;
    try {
      await api.delete(`/fixed-deposits/${deleteFDTargetId}`);
      toast.success("Fixed deposit removed");
      setConfirmDeleteFDOpen(false);
      setDeleteFDTargetId(null);
      await fetchData();
    } catch {
      toast.error("Failed to remove fixed deposit");
    }
  }

  // Group accounts by family member
  const grouped = accounts.reduce<Record<string, BankAccountResponse[]>>(
    (acc, account) => {
      const memberName = account.familyMember?.name ?? "Unknown";
      if (!acc[memberName]) acc[memberName] = [];
      acc[memberName].push(account);
      return acc;
    },
    {}
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Bank Accounts</h1>
        <ShimmerButton onClick={() => setShowAddForm(true)}>
          + Add Account
        </ShimmerButton>
      </div>

      {/* Add Modal */}
      <Modal
        open={showAddForm}
        onClose={() => {
          setShowAddForm(false);
          setAddForm(defaultAddForm);
        }}
        title="Add Bank Account"
      >
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Family Member */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Family Member <span className="text-red-400">*</span>
            </label>
            <select
              value={addForm.familyMemberId}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, familyMemberId: e.target.value }))
              }
              required
              className={inputCls}
            >
              <option value="">Select member…</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bank Name <span className="text-red-400">*</span>
            </label>
            <select
              value={addForm.bankName}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, bankName: e.target.value }))
              }
              required
              className={inputCls}
            >
              {INDIAN_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Account Type <span className="text-red-400">*</span>
            </label>
            <select
              value={addForm.accountType}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  accountType: e.target.value as "savings" | "current",
                }))
              }
              className={inputCls}
            >
              <option value="savings">Savings</option>
              <option value="current">Current</option>
            </select>
          </div>

          {/* Last 4 Digits */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Last 4 Digits <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              maxLength={4}
              value={addForm.accountNumberLast4}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  accountNumberLast4: e.target.value.replace(/\D/g, ""),
                }))
              }
              placeholder="1234"
              required
              className={inputCls}
            />
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              IFSC Code{" "}
              <span className="text-slate-500 text-xs">(optional)</span>
            </label>
            <input
              type="text"
              value={addForm.ifscCode}
              onChange={(e) =>
                setAddForm((f) => ({
                  ...f,
                  ifscCode: e.target.value.toUpperCase(),
                }))
              }
              placeholder="HDFC0001234"
              className={inputCls}
            />
          </div>

          {/* Balance */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Balance (₹) <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={addForm.balance}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, balance: e.target.value }))
              }
              placeholder="0"
              required
              className={inputCls}
            />
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddForm(defaultAddForm);
              }}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <ShimmerButton type="submit" disabled={addSubmitting}>
              {addSubmitting ? "Adding…" : "Add Account"}
            </ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        title="Edit Account"
      >
        <form
          onSubmit={(e) => editingId && handleEdit(e, editingId)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Bank Name
            </label>
            <select
              value={editForm.bankName}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, bankName: e.target.value }))
              }
              className={inputCls}
            >
              {INDIAN_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Account Type
            </label>
            <select
              value={editForm.accountType}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  accountType: e.target.value as "savings" | "current",
                }))
              }
              className={inputCls}
            >
              <option value="savings">Savings</option>
              <option value="current">Current</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Last 4 Digits
            </label>
            <input
              type="text"
              maxLength={4}
              value={editForm.accountNumberLast4}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  accountNumberLast4: e.target.value.replace(/\D/g, ""),
                }))
              }
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              IFSC Code (optional)
            </label>
            <input
              type="text"
              value={editForm.ifscCode}
              onChange={(e) =>
                setEditForm((f) => ({
                  ...f,
                  ifscCode: e.target.value.toUpperCase(),
                }))
              }
              className={inputCls}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Current Balance (₹)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={editForm.balance}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, balance: e.target.value }))
              }
              required
              className={inputCls}
            />
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
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
        title="Delete Account"
        description={`This will permanently remove ${deleteTargetName}. This cannot be undone.`}
      >
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmDeleteOpen(false)}
            className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </Modal>

      {/* Add FD Modal */}
      <Modal
        open={addFDBankAccountId !== null}
        onClose={() => {
          setAddFDBankAccountId(null);
          setFDForm(defaultFDForm);
        }}
        title="Add Fixed Deposit"
      >
        <form onSubmit={handleAddFD} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FDFormFields form={fdForm} onChange={setFDForm} />
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setAddFDBankAccountId(null);
                setFDForm(defaultFDForm);
              }}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <ShimmerButton type="submit" disabled={fdSubmitting}>
              {fdSubmitting ? "Adding…" : "Add FD"}
            </ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Edit FD Modal */}
      <Modal
        open={editingFDId !== null}
        onClose={() => setEditingFDId(null)}
        title="Edit Fixed Deposit"
      >
        <form onSubmit={handleEditFD} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FDFormFields form={editFDForm} onChange={setEditFDForm} />
          <div className="sm:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingFDId(null)}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <ShimmerButton type="submit" disabled={fdSubmitting}>
              {fdSubmitting ? "Saving…" : "Save"}
            </ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Delete FD Confirm Modal */}
      <Modal
        open={confirmDeleteFDOpen}
        onClose={() => setConfirmDeleteFDOpen(false)}
        title="Remove Fixed Deposit"
        description="This will permanently remove this fixed deposit. This cannot be undone."
      >
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setConfirmDeleteFDOpen(false)}
            className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteFD}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </Modal>

      {/* Empty State */}
      {accounts.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No bank accounts yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
            Add your first bank account to start tracking balances
          </p>
          <ShimmerButton onClick={() => setShowAddForm(true)}>
            Add Account
          </ShimmerButton>
        </div>
      )}

      {/* Grouped Account List */}
      {Object.entries(grouped).map(([memberName, memberAccounts]) => (
        <div key={memberName} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1">
            {memberName}
          </h2>

          {memberAccounts.map((account) => {
            const activeFDs = (account.fixedDeposits ?? []).filter(
              (fd) => fd.status === "active"
            );
            const fdTotal = activeFDs.reduce(
              (sum, fd) => sum + Number(fd.principalAmount),
              0
            );
            const savingsBalance = Number(account.balance);
            const totalBalance = savingsBalance + fdTotal;

            return (
              <div
                key={account.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Account Header */}
                <div className="p-4 bg-white dark:bg-slate-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {account.bankName}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            account.accountType === "savings"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                          }`}
                        >
                          {account.accountType === "savings" ? "Savings" : "Current"}
                        </span>
                      </div>

                      <p className="text-sm text-slate-400">
                        ···· <span className="font-mono">{account.accountNumberLast4}</span>
                        {account.ifscCode && (
                          <span className="ml-3 text-slate-400 dark:text-slate-500">
                            {account.ifscCode}
                          </span>
                        )}
                      </p>

                      <div>
                        <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(totalBalance)}
                        </span>
                        {fdTotal > 0 && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            Savings: {formatINR(savingsBalance)} · FDs: {formatINR(fdTotal)}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {balanceStaleness(account.balanceUpdatedAt).label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(account)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openDeleteConfirm(account.id, account.bankName)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* FD Sub-section */}
                <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Fixed Deposits{activeFDs.length > 0 ? ` (${activeFDs.length})` : ""}
                    </span>
                    <button
                      onClick={() => {
                        setAddFDBankAccountId(account.id);
                        setFDForm(defaultFDForm);
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-ocean-accent hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      + Add FD
                    </button>
                  </div>

                  {activeFDs.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                      No active fixed deposits
                    </p>
                  )}

                  <div className="space-y-2">
                    {activeFDs.map((fd) => (
                      <div
                        key={fd.id}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              {fd.fdReferenceNumberLast4 ? (
                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
                                  FD ···· {fd.fdReferenceNumberLast4}
                                </span>
                              ) : (
                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200">
                                  Fixed Deposit
                                </span>
                              )}
                              {fd.autoRenewal && (
                                <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                  Auto-renews
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1 text-xs">
                              <div>
                                <span className="text-slate-400 uppercase tracking-wide">
                                  Principal
                                </span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                  {formatINR(Number(fd.principalAmount))}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400 uppercase tracking-wide">
                                  Rate
                                </span>
                                <p className="font-semibold text-slate-800 dark:text-slate-200">
                                  {fd.interestRate}%
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400 uppercase tracking-wide">
                                  Matures
                                </span>
                                <p className="font-semibold text-amber-600 dark:text-amber-400">
                                  {formatDate(fd.maturityDate)}
                                </p>
                              </div>
                              <div>
                                <span className="text-slate-400 uppercase tracking-wide">
                                  Maturity Amt
                                </span>
                                <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  {formatINR(Number(fd.maturityAmount))}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                              {fd.tenureMonths} months · from {formatDate(fd.startDate)}
                            </p>
                          </div>
                          <div className="flex gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => startEditFD(fd)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteFDTargetId(fd.id);
                                setConfirmDeleteFDOpen(true);
                              }}
                              className="text-xs px-2.5 py-1 rounded-lg border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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

export default BankAccountsPage;
