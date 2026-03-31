import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import type { ApiResponse, FamilyMemberResponse, Relationship } from "@diary/shared";
import { api } from "@/services/api";

const RELATIONSHIPS: Relationship[] = ["spouse", "parent", "child", "sibling", "other"];

const RELATIONSHIP_BADGE: Record<Relationship, string> = {
  self: "bg-blue-100 text-blue-700",
  spouse: "bg-pink-100 text-pink-700",
  parent: "bg-purple-100 text-purple-700",
  child: "bg-green-100 text-green-700",
  sibling: "bg-amber-100 text-amber-700",
  other: "bg-slate-100 text-slate-700",
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

  async function handleDelete(id: string) {
    if (!confirm("Delete this family member?")) return;
    setDeletingId(id);
    try {
      await api.delete<ApiResponse>(`/family-members/${id}`);
      toast.success("Member deleted.");
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Family Members</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-800 focus:outline-none focus:ring-2 focus:ring-ocean-accent focus:ring-offset-2 transition-colors"
        >
          Add Member
        </button>
      </div>

      {/* Inline Add / Edit Form */}
      {showForm && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">
            {editingId ? "Edit Member" : "Add Member"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Name */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              />
            </div>

            {/* Relationship */}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Relationship
              </label>
              <select
                value={form.relationship}
                onChange={(e) =>
                  setForm((f) => ({ ...f, relationship: e.target.value as Relationship }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-ocean-accent focus:outline-none focus:ring-1 focus:ring-ocean-accent"
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
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
        <p className="text-sm text-slate-500">Loading family members…</p>
      )}

      {/* Empty State */}
      {!loading && members.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">No family members yet.</p>
          <p className="mt-1 text-sm text-slate-400">
            Click{" "}
            <button
              onClick={openAdd}
              className="text-ocean-accent underline hover:no-underline"
            >
              Add Member
            </button>{" "}
            to get started.
          </p>
        </div>
      )}

      {/* Member Cards */}
      {!loading && members.length > 0 && (
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
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                {/* Name + Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-slate-900">{member.name}</p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RELATIONSHIP_BADGE[member.relationship]}`}
                    >
                      {member.relationship.charAt(0).toUpperCase() + member.relationship.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Account count */}
                <p className="text-sm text-slate-500">
                  {accountCount === 0
                    ? "No linked accounts"
                    : `${accountCount} linked account${accountCount === 1 ? "" : "s"}`}
                </p>

                {/* Actions */}
                {!isSelf && (
                  <div className="flex gap-2 border-t border-slate-100 pt-3">
                    <button
                      onClick={() => openEdit(member)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-1 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      disabled={deletingId === member.id}
                      className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1 transition-colors disabled:opacity-60"
                    >
                      {deletingId === member.id ? "Deleting…" : "Delete"}
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
