import { UserTable } from "@/components/features/admin/UserTable";

function AdminUsersPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
      <UserTable />
    </div>
  );
}

export default AdminUsersPage;
