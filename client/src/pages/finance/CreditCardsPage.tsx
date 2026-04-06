import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR, daysUntil } from "@/utils/format";
import toast from "react-hot-toast";
import type {
  ApiResponse,
  CreditCardResponse,
  FamilyMemberResponse,
} from "@diary/shared";
import { INDIAN_BANKS } from "@diary/shared";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AddFormState {
  familyMemberId: string;
  bankName: string;
  cardName: string;
  cardNumberLast4: string;
  creditLimit: string;
  currentDue: string;
  minimumDue: string;
  dueDate: string;
  billingCycleDate: string;
}

interface EditFormState {
  bankName: string;
  cardName: string;
  cardNumberLast4: string;
  creditLimit: string;
  currentDue: string;
  minimumDue: string;
  dueDate: string;
  billingCycleDate: string;
}

const defaultAddForm: AddFormState = {
  familyMemberId: "",
  bankName: INDIAN_BANKS[0],
  cardName: "",
  cardNumberLast4: "",
  creditLimit: "",
  currentDue: "",
  minimumDue: "",
  dueDate: "1",
  billingCycleDate: "1",
};

const defaultEditForm: EditFormState = {
  bankName: INDIAN_BANKS[0],
  cardName: "",
  cardNumberLast4: "",
  creditLimit: "",
  currentDue: "",
  minimumDue: "",
  dueDate: "1",
  billingCycleDate: "1",
};

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);

function utilizationColor(utilPct: number): string {
  if (utilPct >= 90) return "text-red-500 dark:text-red-400";
  if (utilPct >= 70) return "text-amber-500 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function dueUrgencyClass(days: number): string {
  if (days <= 3) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (days <= 7) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
}

const inputCls =
  "w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white px-3 py-2 text-sm focus:outline-none focus:border-ocean-accent";
const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

function CreditCardsPage() {
  const [cards, setCards] = useState<CreditCardResponse[]>([]);
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
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [cardsRes, membersRes] = await Promise.all([
        api.get<ApiResponse<CreditCardResponse[]>>("/credit-cards"),
        api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members"),
      ]);
      setCards(cardsRes.data ?? []);
      setFamilyMembers(membersRes.data ?? []);
    } catch {
      toast.error("Failed to load credit cards");
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
    if (!addForm.cardNumberLast4 || addForm.cardNumberLast4.length !== 4) {
      toast.error("Last 4 digits must be exactly 4 characters");
      return;
    }
    const creditLimitNum = parseFloat(addForm.creditLimit);
    if (isNaN(creditLimitNum) || creditLimitNum <= 0) {
      toast.error("Please enter a valid credit limit");
      return;
    }
    const currentDueNum = parseFloat(addForm.currentDue);
    if (isNaN(currentDueNum) || currentDueNum < 0) {
      toast.error("Please enter a valid current due amount");
      return;
    }
    const minimumDueNum = parseFloat(addForm.minimumDue);
    if (isNaN(minimumDueNum) || minimumDueNum < 0) {
      toast.error("Please enter a valid minimum due amount");
      return;
    }

    setAddSubmitting(true);
    try {
      await api.post<ApiResponse<CreditCardResponse>>("/credit-cards", {
        familyMemberId: addForm.familyMemberId,
        bankName: addForm.bankName,
        cardName: addForm.cardName,
        cardNumberLast4: addForm.cardNumberLast4,
        creditLimit: creditLimitNum,
        currentDue: currentDueNum,
        minimumDue: minimumDueNum,
        dueDate: parseInt(addForm.dueDate, 10),
        billingCycleDate: parseInt(addForm.billingCycleDate, 10),
      });
      toast.success("Credit card added successfully");
      setShowAddForm(false);
      setAddForm(defaultAddForm);
      await fetchData();
    } catch {
      toast.error("Failed to add credit card");
    } finally {
      setAddSubmitting(false);
    }
  }

  function startEdit(card: CreditCardResponse) {
    setEditingId(card.id);
    setEditForm({
      bankName: card.bankName,
      cardName: card.cardName,
      cardNumberLast4: card.cardNumberLast4,
      creditLimit: (Number(card.creditLimit) / 100).toFixed(0),
      currentDue: (Number(card.currentDue) / 100).toFixed(0),
      minimumDue: (Number(card.minimumDue) / 100).toFixed(0),
      dueDate: String(card.dueDate),
      billingCycleDate: String(card.billingCycleDate),
    });
  }

  async function handleEdit(e: React.FormEvent, cardId: string) {
    e.preventDefault();
    const creditLimitNum = parseFloat(editForm.creditLimit);
    if (isNaN(creditLimitNum) || creditLimitNum <= 0) {
      toast.error("Please enter a valid credit limit");
      return;
    }
    const currentDueNum = parseFloat(editForm.currentDue);
    if (isNaN(currentDueNum) || currentDueNum < 0) {
      toast.error("Please enter a valid current due amount");
      return;
    }
    const minimumDueNum = parseFloat(editForm.minimumDue);
    if (isNaN(minimumDueNum) || minimumDueNum < 0) {
      toast.error("Please enter a valid minimum due amount");
      return;
    }

    setEditSubmitting(true);
    try {
      await api.put<ApiResponse<CreditCardResponse>>(`/credit-cards/${cardId}`, {
        bankName: editForm.bankName,
        cardName: editForm.cardName,
        cardNumberLast4: editForm.cardNumberLast4,
        creditLimit: creditLimitNum,
        currentDue: currentDueNum,
        minimumDue: minimumDueNum,
        dueDate: parseInt(editForm.dueDate, 10),
        billingCycleDate: parseInt(editForm.billingCycleDate, 10),
      });
      toast.success("Credit card updated");
      setEditingId(null);
      await fetchData();
    } catch {
      toast.error("Failed to update credit card");
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
      await api.delete<ApiResponse<unknown>>(`/credit-cards/${deleteTargetId}`);
      toast.success("Card deleted");
      setConfirmDeleteOpen(false);
      setDeleteTargetId(null);
      await fetchData();
    } catch {
      toast.error("Failed to delete card");
    }
  }

  // Group cards by family member
  const grouped = cards.reduce<Record<string, CreditCardResponse[]>>(
    (acc, card) => {
      const memberName = card.familyMember?.name ?? "Unknown";
      if (!acc[memberName]) acc[memberName] = [];
      acc[memberName].push(card);
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
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Credit Cards</h1>
        <ShimmerButton onClick={() => setShowAddForm(true)}>+ Add Card</ShimmerButton>
      </div>

      {/* Add Modal */}
      <Modal
        open={showAddForm}
        onClose={() => { setShowAddForm(false); setAddForm(defaultAddForm); }}
        title="Add Credit Card"
      >
        <form onSubmit={handleAdd} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Family Member <span className="text-red-400">*</span></label>
            <select
              value={addForm.familyMemberId}
              onChange={(e) => setAddForm((f) => ({ ...f, familyMemberId: e.target.value }))}
              required
              className={inputCls}
            >
              <option value="">Select member…</option>
              {familyMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Bank Name <span className="text-red-400">*</span></label>
            <select
              value={addForm.bankName}
              onChange={(e) => setAddForm((f) => ({ ...f, bankName: e.target.value }))}
              required
              className={inputCls}
            >
              {INDIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Card Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={addForm.cardName}
              onChange={(e) => setAddForm((f) => ({ ...f, cardName: e.target.value }))}
              placeholder="e.g. Regalia, Millennia"
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Last 4 Digits <span className="text-red-400">*</span></label>
            <input
              type="text"
              maxLength={4}
              value={addForm.cardNumberLast4}
              onChange={(e) => setAddForm((f) => ({ ...f, cardNumberLast4: e.target.value.replace(/\D/g, "") }))}
              placeholder="1234"
              required
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Credit Limit (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="1" value={addForm.creditLimit}
              onChange={(e) => setAddForm((f) => ({ ...f, creditLimit: e.target.value }))}
              placeholder="100000" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Current Due (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="0.01" value={addForm.currentDue}
              onChange={(e) => setAddForm((f) => ({ ...f, currentDue: e.target.value }))}
              placeholder="0" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Minimum Due (₹) <span className="text-red-400">*</span></label>
            <input type="number" min="0" step="0.01" value={addForm.minimumDue}
              onChange={(e) => setAddForm((f) => ({ ...f, minimumDue: e.target.value }))}
              placeholder="0" required className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Due Date (day of month) <span className="text-red-400">*</span></label>
            <select value={addForm.dueDate}
              onChange={(e) => setAddForm((f) => ({ ...f, dueDate: e.target.value }))}
              required className={inputCls}>
              {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Billing Cycle Date <span className="text-red-400">*</span></label>
            <select value={addForm.billingCycleDate}
              onChange={(e) => setAddForm((f) => ({ ...f, billingCycleDate: e.target.value }))}
              required className={inputCls}>
              {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button"
              onClick={() => { setShowAddForm(false); setAddForm(defaultAddForm); }}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5">
              Cancel
            </button>
            <ShimmerButton type="submit" disabled={addSubmitting}>
              {addSubmitting ? "Adding…" : "Add Card"}
            </ShimmerButton>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        title="Edit Credit Card"
      >
        <form onSubmit={(e) => editingId && handleEdit(e, editingId)}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Bank Name</label>
            <select value={editForm.bankName}
              onChange={(e) => setEditForm((f) => ({ ...f, bankName: e.target.value }))}
              className={inputCls}>
              {INDIAN_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Card Name</label>
            <input type="text" value={editForm.cardName}
              onChange={(e) => setEditForm((f) => ({ ...f, cardName: e.target.value }))}
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Last 4 Digits</label>
            <input type="text" maxLength={4} value={editForm.cardNumberLast4}
              onChange={(e) => setEditForm((f) => ({ ...f, cardNumberLast4: e.target.value.replace(/\D/g, "") }))}
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Credit Limit (₹)</label>
            <input type="number" min="0" step="1" value={editForm.creditLimit}
              onChange={(e) => setEditForm((f) => ({ ...f, creditLimit: e.target.value }))}
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Current Due (₹)</label>
            <input type="number" min="0" step="0.01" value={editForm.currentDue}
              onChange={(e) => setEditForm((f) => ({ ...f, currentDue: e.target.value }))}
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Minimum Due (₹)</label>
            <input type="number" min="0" step="0.01" value={editForm.minimumDue}
              onChange={(e) => setEditForm((f) => ({ ...f, minimumDue: e.target.value }))}
              className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Due Date (day)</label>
            <select value={editForm.dueDate}
              onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
              className={inputCls}>
              {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Billing Cycle Date (day)</label>
            <select value={editForm.billingCycleDate}
              onChange={(e) => setEditForm((f) => ({ ...f, billingCycleDate: e.target.value }))}
              className={inputCls}>
              {DAY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
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
        title="Delete Card"
        description={`This will permanently remove ${deleteTargetName}. This cannot be undone.`}
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
      {cards.length === 0 && (
        <div className="text-center py-16 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 text-lg mb-2">No credit cards yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
            Add your first credit card to track dues and limits
          </p>
          <ShimmerButton onClick={() => setShowAddForm(true)}>Add Card</ShimmerButton>
        </div>
      )}

      {/* Grouped Card List */}
      {Object.entries(grouped).map(([memberName, memberCards]) => (
        <div key={memberName} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700 pb-1">
            {memberName}
          </h2>

          {memberCards.map((card) => {
            const due = daysUntil(card.dueDate);
            const creditLimitNum = Number(card.creditLimit);
            const currentDueNum = Number(card.currentDue);
            const utilPct =
              creditLimitNum > 0
                ? Math.round((currentDueNum / creditLimitNum) * 100)
                : 0;

            return (
              <div
                key={card.id}
                className={cn(
                  "rounded-xl border p-4",
                  "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {card.bankName}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 text-sm">
                        {card.cardName}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                        ···· {card.cardNumberLast4}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Current Due</span>
                        <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(card.currentDue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Credit Limit</span>
                        <span className="text-base font-semibold text-slate-600 dark:text-slate-300">
                          {formatINR(card.creditLimit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">Min Due</span>
                        <span className="text-base font-semibold text-slate-600 dark:text-slate-300">
                          {formatINR(card.minimumDue)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-medium ${utilizationColor(utilPct)}`}>
                        {utilPct}% utilization
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dueUrgencyClass(due.days)}`}>
                        Due on {card.dueDate} — {due.label}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        Billing cycle: {card.billingCycleDate}th
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(card)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(card.id, `${card.bankName} ${card.cardName}`)}
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

export default CreditCardsPage;
