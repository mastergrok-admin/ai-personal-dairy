import { useState, useEffect } from "react";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import type { ApiResponse } from "@diary/shared";

function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<Record<string, string>>>("/admin/settings").then((res) => {
      if (res.success && res.data) setSettings(res.data);
      setIsLoading(false);
    });
  }, []);

  const toggleSetting = async (key: string) => {
    const newValue = settings[key] === "true" ? "false" : "true";
    try {
      await api.put("/admin/settings", { key, value: newValue });
      setSettings((prev) => ({ ...prev, [key]: newValue }));
      toast.success("Setting updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update setting");
    }
  };

  if (isLoading) return <p className="text-gray-500 dark:text-slate-400">Loading settings...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">App Settings</h1>

      <div className="rounded-lg bg-white dark:bg-white/[0.03] p-6 shadow-md dark:shadow-none dark:border dark:border-white/8">
        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/8">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">User Invites</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">Allow any authenticated user to send invites</p>
          </div>
          <button
            onClick={() => toggleSetting("userInvitesEnabled")}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.userInvitesEnabled === "true" ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.userInvitesEnabled === "true" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSettingsPage;
