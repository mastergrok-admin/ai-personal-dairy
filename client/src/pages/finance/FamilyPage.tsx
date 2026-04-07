import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { ApiResponse, FamilyMemberResponse, Relationship } from "@diary/shared";
import { api } from "@/services/api";
import { Modal } from "@/components/ui/modal";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const RELATIONSHIPS: Relationship[] = ["spouse", "parent", "child", "sibling", "other"];

const RELATIONSHIP_BADGE: Record<Relationship, string> = {
  self: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  spouse: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  parent: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  child: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  sibling: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  other: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

interface FormState {
  name: string;
  relationship: Relationship;
}

const DEFAULT_FORM: FormState = { name: "", relationship: "spouse" };

function FamilyPage() {
  const [members, setMembers] = useState<FamilyMemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");

  async function fetchMembers() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<FamilyMemberResponse[]>>("/family-members");
      setMembers(res.data ?? []);
    } catch {
      toast.error("Failed to load family members.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setShowForm(true);
  }

  function openEdit(member: FamilyMemberResponse) {
    setEditingId(member.id);
    setForm({ name: member.name, relationship: member.relationship });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put<ApiResponse<FamilyMemberResponse>>(
          `/family-members/${editingId}`,
          { name: form.name.trim(), relationship: form.relationship },
        );
        toast.success("Member updated.");
      } else {
        await api.post<ApiResponse<FamilyMemberResponse>>(
          "/family-members",
          { name: form.name.trim(), relationship: form.relationship },
        );
        toast.success("Member added.");
      }
      cancelForm();
      await fetchMembers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(id: string, name: string) {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setConfirmDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    setDeletingId(deleteTargetId);
    try {
      await api.delete<ApiResponse<unknown>>(`/family-members/${deleteTargetId}`);
      toast.success("Member removed.");
      setMembers((prev) => prev.filter((m) => m.id !== deleteTargetId));
      setConfirmDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Family</h1>
        <ShimmerButton onClick={openAdd}>+ Add Member</ShimmerButton>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={showForm}
        onClose={cancelForm}
        title={editingId ? "Edit Member" : "Add Family Member"}
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Priya Kumar"
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-ocean-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Relationship <span className="text-red-500">*</span>
            </label>
            <select
              value={form.relationship}
              onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value as Relationship }))}
              className="w-full rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-ocean-accent"
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r} className="capitalize">{r}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={cancelForm}
              disabled={saving}
              className="rounded-lg border border-slate-300 dark:border-white/10 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <ShimmerButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </ShimmerButton>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Remove Member"
        description={`This will remove ${deleteTargetName} from your family. This cannot be undone.`}
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
            disabled={!!deletingId}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deletingId ? "Removing…" : "Remove"}
          </button>
        </div>
      </Modal>

      {/* Empty State */}
      {members.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-white/[0.02] px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No family members yet.</p>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            Click{" "}
            <button onClick={openAdd} className="text-ocean-accent underline hover:no-underline">
              Add Member
            </button>{" "}
            to get started.
          </p>
        </div>
      )}

      {/* Member Cards */}
      {members.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const isSelf = member.relationship === "self";
            const accountCount =
              (member._count?.bankAccounts ?? 0) +
              (member._count?.creditCards ?? 0) +
              (member._count?.loans ?? 0);

            return (
              <div
                key={member.id}
                className="rounded-xl border p-5 border-slate-200 bg-white dark:border-white/8 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Avatar with initials */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-ocean-accent to-ocean-violet text-sm font-bold text-slate-900">
                      {member.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{member.name}</p>
                      <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize mt-0.5", RELATIONSHIP_BADGE[member.relationship])}>
                        {member.relationship}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  {accountCount === 0
                    ? "No linked accounts"
                    : `${accountCount} linked account${accountCount === 1 ? "" : "s"}`}
                </p>

                {!isSelf && (
                  <div className="flex gap-2 border-t border-slate-100 dark:border-white/8 pt-3 mt-3">
                    <button
                      onClick={() => openEdit(member)}
                      className="rounded-lg border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(member.id, member.name)}
                      className="rounded-lg border border-red-200 dark:border-red-500/30 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                    >
                      Remove
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

export default FamilyPage;
