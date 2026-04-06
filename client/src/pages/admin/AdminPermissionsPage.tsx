import { PermissionManager } from "@/components/features/admin/PermissionManager";

function AdminPermissionsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Permission Management</h1>
      <PermissionManager />
    </div>
  );
}

export default AdminPermissionsPage;
