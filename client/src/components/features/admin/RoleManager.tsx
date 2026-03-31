import { useState, useEffect, useCallback } from "react";
import { api } from "@/services/api";
import type { RoleWithPermissions, AuthPermission, ApiResponse } from "@diary/shared";
import toast from "react-hot-toast";

interface PermissionsResponse {
  success: boolean;
  data: {
    permissions: AuthPermission[];
    grouped: Record<string, AuthPermission[]>;
  };
}

function RoleManager() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [_allPermissions, setAllPermissions] = useState<AuthPermission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, AuthPermission[]>>({});
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPermIds, setEditPermIds] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ name: "", description: "" });

  const fetchRoles = useCallback(async () => {
    const res = await api.get<ApiResponse<RoleWithPermissions[]>>("/roles");
    if (res.data) setRoles(res.data);
  }, []);

  const fetchPermissions = useCallback(async () => {
    const res = await api.get<PermissionsResponse>("/permissions");
    setAllPermissions(res.data.permissions);
    setGroupedPermissions(res.data.grouped);
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, [fetchRoles, fetchPermissions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/roles", newRole);
      toast.success("Role created");
      setNewRole({ name: "", description: "" });
      setShowCreate(false);
      fetchRoles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/roles/${id}`);
      toast.success("Role deleted");
      fetchRoles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  };

  const startEditPermissions = (role: RoleWithPermissions) => {
    setEditingRole(role.id);
    setEditPermIds(role.permissions.map((p) => p.id));
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;
    try {
      await api.put(`/roles/${editingRole}/permissions`, {
        permissionIds: editPermIds,
      });
      toast.success("Permissions updated");
      setEditingRole(null);
      fetchRoles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreate ? "Cancel" : "Create Role"}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="rounded-lg border bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              placeholder="Role name"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              required
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Description"
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="mt-3 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            Save
          </button>
        </form>
      )}

      <div className="space-y-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-lg border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">
                  {role.name}
                  {role.isDefault && (
                    <span className="ml-2 text-xs text-green-600">(default)</span>
                  )}
                </h3>
                <p className="text-sm text-gray-500">{role.description}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {role.permissions.length} permissions
                  {role._count && ` / ${role._count.users} users`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEditPermissions(role)}
                  className="rounded border px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                >
                  Edit Permissions
                </button>
                <button
                  onClick={() => handleDelete(role.id)}
                  className="rounded border px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>

            {editingRole === role.id && (
              <div className="mt-4 border-t pt-4">
                <h4 className="mb-2 text-sm font-medium text-gray-700">Permissions</h4>
                <div className="space-y-3">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div key={module}>
                      <p className="mb-1 text-xs font-semibold uppercase text-gray-500">
                        {module}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {perms.map((perm) => (
                          <label key={perm.id} className="flex items-center gap-1 text-sm">
                            <input
                              type="checkbox"
                              checked={editPermIds.includes(perm.id)}
                              onChange={(e) => {
                                setEditPermIds(
                                  e.target.checked
                                    ? [...editPermIds, perm.id]
                                    : editPermIds.filter((id) => id !== perm.id),
                                );
                              }}
                            />
                            {perm.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleSavePermissions}
                    className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingRole(null)}
                    className="rounded bg-gray-200 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export { RoleManager };
