import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { ApiResponse, ReminderResponse, ReminderFrequency } from "@diary/shared";
import { api } from "@/services/api";

type ReminderType = ReminderResponse["type"];
type Tab = "upcoming" | "all";

const TYPE_BADGE: Record<ReminderType, string> = {
  credit_card_due: "bg-red-100 text-red-700",
  loan_emi: "bg-amber-100 text-amber-700",
  balance_update: "bg-blue-100 text-blue-700",
  custom: "bg-purple-100 text-purple-700",
};

const TYPE_LABEL: Record<ReminderType, string> = {
  credit_card_due: "Credit Card Due",
  loan_emi: "Loan EMI",
  balance_update: "Balance Update",
  custom: "Custom",
};

const FREQUENCIES: ReminderFrequency[] = ["once", "monthly", "quarterly", "yearly"];

interface FormState {
  title: string;
  description: string;
  dueDate: string;
  recurringDay: string;
  frequency: ReminderFrequency;
}

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  dueDate: "",
  recurringDay: "",
  frequency: "monthly",
};

function getDaysLeft(reminder: ReminderResponse): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (reminder.dueDate) {
    const due = new Date(reminder.dueDate);
    due.setHours(0, 0, 0, 0);
    return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (reminder.recurringDay) {
    const day = reminder.recurringDay;
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
    if (thisMonth >= today) {
      return Math.ceil((thisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, day);
    return Math.ceil((nextMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  return null;
}

function getNextOccurrenceLabel(reminder: ReminderResponse): string {
  if (reminder.dueDate) {
    const date = new Date(reminder.dueDate);
    return `Due: ${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
  }
  if (reminder.recurringDay) {
    const daysLeft = getDaysLeft(reminder);
    if (daysLeft === null) return `Day ${reminder.recurringDay} of each month`;
    if (daysLeft === 0) return `Today (day ${reminder.recurringDay})`;
    if (daysLeft === 1) return `Tomorrow (day ${reminder.recurringDay})`;
    return `In ${daysLeft} days (day ${reminder.recurringDay})`;
  }
  return "—";
}

function RemindersPage() {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [reminders, setReminders] = useState<ReminderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchReminders(upcoming: boolean) {
    setLoading(true);
    try {
      const url = upcoming ? "/reminders?upcoming=true" : "/reminders";
      const res = await api.get<ApiResponse<ReminderResponse[]>>(url);
      let data = res.data ?? [];
      if (upcoming) {
        data = [...data].sort((a, b) => {
          const dA = getDaysLeft(a) ?? Infinity;
          const dB = getDaysLeft(b) ?? Infinity;
          return dA - dB;
        });
      }
      setReminders(data);
    } catch {
      toast.error("Failed to load reminders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReminders(tab === "upcoming");
  }, [tab]);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await api.post<ApiResponse<{ created: number; updated: number; deactivated: number }>>(
        "/reminders/generate",
        {},
      );
      const { created = 0, updated = 0, deactivated = 0 } = res.data ?? {};
      toast.success(`Sync done: ${created} created, ${updated} updated, ${deactivated} deactivated.`);
      await fetchReminders(tab === "upcoming");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed.";
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  }

  function openAdd() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(reminder: ReminderResponse) {
    setEditingId(reminder.id);
    setForm({
      title: reminder.title,
      description: reminder.description ?? "",
      dueDate: reminder.dueDate ? reminder.dueDate.split("T")[0] : "",
      recurringDay: reminder.recurringDay ? String(reminder.recurringDay) : "",
      frequency: reminder.frequency,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!form.dueDate && !form.recurringDay) {
      toast.error("Provide either a due date or a recurring day.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        frequency: form.frequency,
      };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
      if (form.recurringDay) payload.recurringDay = Number(form.recurringDay);

      if (editingId) {
        await api.put<ApiResponse<ReminderResponse>>(`/reminders/${editingId}`, payload);
        toast.success("Reminder updated.");
      } else {
        await api.post<ApiResponse<ReminderResponse>>("/reminders", payload);
        toast.success("Reminder added.");
      }
      cancelForm();
      await fetchReminders(tab === "upcoming");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this reminder?")) return;
    setDeletingId(id);
    try {
      await api.delete<ApiResponse>(`/reminders/${id}`);
      toast.success("Reminder deleted.");
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  const isCustom = (r: ReminderResponse) => r.type === "custom";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Reminders</h1>
        <div className="flex gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 transition-colors disabled:opacity-60"
          >
            {syncing ? "Syncing…" : "Sync Reminders"}
          </button>
          <button
            onClick={openAdd}
            className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-accent focus:ring-offset-2 transition-colors"
          >
            Add Reminder
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["upcoming", "all"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
              tab === t
                ? "border-b-2 border-ocean-accent text-ocean-accent"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "upcoming" ? "Upcoming" : "All Reminders"}
          </button>
        ))}
      </div>

      {/* Inline Add / Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            {editingId ? "Edit Reminder" : "Add Reminder"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. HDFC Credit Card Payment"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description <span className="text-slate-400 text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Additional details"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Due Date <span className="text-slate-400 text-xs">(for one-time)</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, dueDate: e.target.value, recurringDay: e.target.value ? "" : f.recurringDay }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              />
            </div>

            {/* Recurring Day */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Recurring Day <span className="text-slate-400 text-xs">(1–31, for recurring)</span>
              </label>
              <select
                value={form.recurringDay}
                onChange={(e) =>
                  setForm((f) => ({ ...f, recurringDay: e.target.value, dueDate: e.target.value ? "" : f.dueDate }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              >
                <option value="">— select day —</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as ReminderFrequency }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              >
                {FREQUENCIES.map((freq) => (
                  <option key={freq} value={freq}>
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-accent focus:ring-offset-2 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelForm}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-slate-500">Loading reminders…</p>
      )}

      {/* Empty State */}
      {!loading && reminders.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">
            {tab === "upcoming" ? "No upcoming reminders." : "No reminders yet."}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Click{" "}
            <button
              onClick={handleSync}
              className="text-ocean-accent underline hover:no-underline"
            >
              Sync Reminders
            </button>{" "}
            to auto-generate, or{" "}
            <button
              onClick={openAdd}
              className="text-ocean-accent underline hover:no-underline"
            >
              Add Reminder
            </button>{" "}
            to create a custom one.
          </p>
        </div>
      )}

      {/* Reminder Cards */}
      {!loading && reminders.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reminders.map((reminder) => {
            const daysLeft = getDaysLeft(reminder);
            const isUrgent = daysLeft !== null && daysLeft <= 3;

            return (
              <div
                key={reminder.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                {/* Type badge + Auto label */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[reminder.type]}`}
                  >
                    {TYPE_LABEL[reminder.type]}
                  </span>
                  {!isCustom(reminder) && (
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Auto
                    </span>
                  )}
                  {isUrgent && (
                    <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                      Urgent
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <p className="text-base font-semibold text-slate-900">{reminder.title}</p>
                  {reminder.description && (
                    <p className="mt-0.5 text-sm text-slate-500">{reminder.description}</p>
                  )}
                </div>

                {/* Next occurrence */}
                <p className={`text-sm ${isUrgent ? "font-medium text-red-600" : "text-slate-500"}`}>
                  {getNextOccurrenceLabel(reminder)}
                </p>

                {/* Frequency badge */}
                <div>
                  <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
                    {reminder.frequency}
                  </span>
                </div>

                {/* Actions — custom only */}
                {isCustom(reminder) && (
                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(reminder)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(reminder.id)}
                      disabled={deletingId === reminder.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1 transition-colors disabled:opacity-60"
                    >
                      {deletingId === reminder.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RemindersPage;
