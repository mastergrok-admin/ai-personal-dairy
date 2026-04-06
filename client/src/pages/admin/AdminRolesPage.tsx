import { RoleManager } from "@/components/features/admin/RoleManager";

function AdminRolesPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">Role Management</h1>
      <RoleManager />
    </div>
  );
}

export default AdminRolesPage;
