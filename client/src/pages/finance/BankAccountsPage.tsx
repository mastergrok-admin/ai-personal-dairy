import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, balanceStaleness } from "@/utils/format";
import toast from "react-hot-toast";
import type {
  ApiResponse,
  FamilyMemberResponse,
  BankAccountResponse,
} from "@diary/shared";
import { INDIAN_BANKS } from "@diary/shared";

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
};

function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccountResponse[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberResponse[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddFormState>(defaultAddForm);
  const [addSubmitting, setAddSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>(defaultEditForm);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Balance update state
  const [updatingBalanceId, setUpdatingBalanceId] = useState<string | null>(
    null
  );
  const [balanceInput, setBalanceInput] = useState<string>("");
  const [balanceSubmitting, setBalanceSubmitting] = useState(false);

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
    });
    setUpdatingBalanceId(null);
  }

  async function handleEdit(e: React.FormEvent, accountId: string) {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await api.put<ApiResponse<BankAccountResponse>>(
        `/bank-accounts/${accountId}`,
        {
          bankName: editForm.bankName,
          accountType: editForm.accountType,
          accountNumberLast4: editForm.accountNumberLast4,
          ifscCode: editForm.ifscCode || undefined,
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

  async function handleDelete(accountId: string, bankName: string) {
    if (!confirm(`Delete ${bankName} account? This cannot be undone.`)) return;
    try {
      await api.delete<ApiResponse<unknown>>(`/bank-accounts/${accountId}`);
      toast.success("Account deleted");
      await fetchData();
    } catch {
      toast.error("Failed to delete account");
    }
  }

  function startBalanceUpdate(account: BankAccountResponse) {
    setUpdatingBalanceId(account.id);
    // Convert paise string back to rupees for display
    const rupees = (Number(account.balance) / 100).toFixed(0);
    setBalanceInput(rupees);
    setEditingId(null);
  }

  async function handleBalanceUpdate(e: React.FormEvent, accountId: string) {
    e.preventDefault();
    const balanceNum = parseFloat(balanceInput);
    if (isNaN(balanceNum) || balanceNum < 0) {
      toast.error("Please enter a valid balance");
      return;
    }
    setBalanceSubmitting(true);
    try {
      await api.put<ApiResponse<BankAccountResponse>>(
        `/bank-accounts/${accountId}/balance`,
        { balance: balanceNum }
      );
      toast.success("Balance updated");
      setUpdatingBalanceId(null);
      setBalanceInput("");
      await fetchData();
    } catch {
      toast.error("Failed to update balance");
    } finally {
      setBalanceSubmitting(false);
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-ocean-accent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">Bank Accounts</h1>
        <button
          onClick={() => {
            setShowAddForm((prev) => !prev);
            setEditingId(null);
            setUpdatingBalanceId(null);
          }}
          className="px-4 py-2 rounded-lg bg-ocean-700 hover:bg-ocean-600 text-white font-medium transition-colors"
        >
          {showAddForm ? "Cancel" : "Add Account"}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="text-lg font-semibold text-slate-100 mb-4">
            Add Bank Account
          </h2>
          <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Family Member */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Family Member <span className="text-red-400">*</span>
              </label>
              <select
                value={addForm.familyMemberId}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, familyMemberId: e.target.value }))
                }
                required
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 focus:outline-none focus:border-ocean-accent"
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
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Bank Name <span className="text-red-400">*</span>
              </label>
              <select
                value={addForm.bankName}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, bankName: e.target.value }))
                }
                required
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 focus:outline-none focus:border-ocean-accent"
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
              <label className="block text-sm font-medium text-slate-300 mb-1">
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
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 focus:outline-none focus:border-ocean-accent"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </div>

            {/* Last 4 Digits */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
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
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 focus:outline-none focus:border-ocean-accent"
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
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
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 focus:outline-none focus:border-ocean-accent"
              />
            </div>

            {/* Balance */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-1">
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
                className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 focus:outline-none focus:border-ocean-accent"
              />
            </div>

            <div className="sm:col-span-2 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setAddForm(defaultAddForm);
                }}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSubmitting}
                className="px-4 py-2 rounded-lg bg-ocean-700 hover:bg-ocean-600 text-white font-medium transition-colors disabled:opacity-50"
              >
                {addSubmitting ? "Adding…" : "Add Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Empty State */}
      {accounts.length === 0 && !showAddForm && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-700">
          <p className="text-slate-400 text-lg mb-2">No bank accounts yet</p>
          <p className="text-slate-500 text-sm mb-4">
            Add your first bank account to start tracking balances
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-lg bg-ocean-700 hover:bg-ocean-600 text-white font-medium transition-colors"
          >
            Add Account
          </button>
        </div>
      )}

      {/* Grouped Account List */}
      {Object.entries(grouped).map(([memberName, memberAccounts]) => (
        <div key={memberName} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-700 pb-1">
            {memberName}
          </h2>

          {memberAccounts.map((account) => {
            const staleness = balanceStaleness(account.balanceUpdatedAt);
            const isEditing = editingId === account.id;
            const isUpdatingBalance = updatingBalanceId === account.id;

            return (
              <div
                key={account.id}
                className="rounded-xl border border-slate-700 bg-slate-800 p-4"
              >
                {isEditing ? (
                  /* Edit Form */
                  <form
                    onSubmit={(e) => handleEdit(e, account.id)}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                  >
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Bank Name
                      </label>
                      <select
                        value={editForm.bankName}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            bankName: e.target.value,
                          }))
                        }
                        className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent"
                      >
                        {INDIAN_BANKS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Account Type
                      </label>
                      <select
                        value={editForm.accountType}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            accountType: e.target.value as
                              | "savings"
                              | "current",
                          }))
                        }
                        className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent"
                      >
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        Last 4 Digits
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={editForm.accountNumberLast4}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            accountNumberLast4: e.target.value.replace(
                              /\D/g,
                              ""
                            ),
                          }))
                        }
                        className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
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
                        className="w-full rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent"
                      />
                    </div>

                    <div className="sm:col-span-2 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={editSubmitting}
                        className="px-3 py-1.5 text-sm rounded-lg bg-ocean-700 hover:bg-ocean-600 text-white font-medium transition-colors disabled:opacity-50"
                      >
                        {editSubmitting ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Account Card */
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-100">
                          {account.bankName}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            account.accountType === "savings"
                              ? "bg-blue-900 text-blue-300"
                              : "bg-purple-900 text-purple-300"
                          }`}
                        >
                          {account.accountType === "savings"
                            ? "Savings"
                            : "Current"}
                        </span>
                      </div>

                      <p className="text-sm text-slate-400">
                        ····{" "}
                        <span className="font-mono">
                          {account.accountNumberLast4}
                        </span>
                        {account.ifscCode && (
                          <span className="ml-3 text-slate-500">
                            {account.ifscCode}
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-lg font-bold text-slate-100">
                          {formatINR(account.balance)}
                        </span>
                        {staleness.stale ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900 text-amber-300 font-medium">
                            ⚠ {staleness.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            {staleness.label}
                          </span>
                        )}
                      </div>

                      {/* Update Balance Inline */}
                      {isUpdatingBalance && (
                        <form
                          onSubmit={(e) => handleBalanceUpdate(e, account.id)}
                          className="flex items-center gap-2 mt-2"
                        >
                          <span className="text-slate-400 text-sm">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={balanceInput}
                            onChange={(e) => setBalanceInput(e.target.value)}
                            className="w-36 rounded-lg bg-slate-900 border border-slate-600 text-slate-100 px-2 py-1 text-sm focus:outline-none focus:border-ocean-accent"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={balanceSubmitting}
                            className="px-3 py-1 text-sm rounded-lg bg-ocean-700 hover:bg-ocean-600 text-white transition-colors disabled:opacity-50"
                          >
                            {balanceSubmitting ? "…" : "Update"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setUpdatingBalanceId(null)}
                            className="px-3 py-1 text-sm rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!isUpdatingBalance && (
                        <button
                          onClick={() => startBalanceUpdate(account)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-ocean-accent hover:bg-slate-700 transition-colors"
                        >
                          Update Balance
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(account)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(account.id, account.bankName)
                        }
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default BankAccountsPage;
