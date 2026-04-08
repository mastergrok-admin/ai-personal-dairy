import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR } from "@/utils/format";
import toast from "react-hot-toast";
import type { ApiResponse, NetWorthResponse } from "@diary/shared";
import { Skeleton } from "@/components/ui/skeleton";

function NetWorthPage() {
  const [data, setData] = useState<NetWorthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<NetWorthResponse>>("/dashboard/net-worth")
      .then((res) => setData(res.data ?? null))
      .catch(() => toast.error("Failed to load net worth"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-6 space-y-4"><Skeleton className="h-16 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (!data) return null;

  const rows = [
    { label: "Bank + FD", value: data.assets.bankAndFD, type: "asset" },
    { label: "Investments", value: data.assets.investments, type: "asset" },
    { label: "Gold", value: data.assets.gold, type: "asset" },
    { label: "Properties", value: data.assets.properties, type: "asset" },
    { label: "Lent to others", value: data.assets.lentToOthers, type: "asset" },
    { label: "Home / Car / Personal Loans", value: data.liabilities.loans, type: "liability" },
    { label: "Credit Card Dues", value: data.liabilities.creditCards, type: "liability" },
    { label: "Borrowed from others", value: data.liabilities.borrowedFromOthers, type: "liability" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Net Worth</h1>

      {/* Summary banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Total Net Worth</p>
        <p className={`text-4xl font-bold mt-1 ${data.netWorth >= 0 ? "text-slate-900 dark:text-white" : "text-red-600 dark:text-red-400"}`}>{formatINR(data.netWorth)}</p>
        <div className="flex gap-6 mt-3">
          <div><p className="text-xs text-slate-400">Total Assets</p><p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(Object.values(data.assets).reduce((s, v) => s + v, 0))}</p></div>
          <div><p className="text-xs text-slate-400">Total Liabilities</p><p className="text-lg font-semibold text-red-600 dark:text-red-400">{formatINR(Object.values(data.liabilities).reduce((s, v) => s + v, 0))}</p></div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${row.type === "asset" ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className="text-sm text-slate-700 dark:text-slate-300">{row.label}</span>
              {row.value === 0 && row.type === "asset" && <span className="text-xs text-slate-400">(add in future phases)</span>}
            </div>
            <span className={`font-semibold text-sm ${row.type === "asset" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{formatINR(row.value)}</span>
          </div>
        ))}
      </div>

      {/* Monthly summary */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">This Month</h2>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-slate-400">Income</p><p className="text-lg font-bold text-slate-900 dark:text-white">{formatINR(data.monthlySummary.income)}</p></div>
          <div><p className="text-xs text-slate-400">Expenses</p><p className="text-lg font-bold text-slate-900 dark:text-white">{formatINR(data.monthlySummary.expenses)}</p></div>
          <div><p className="text-xs text-slate-400">Savings Rate</p><p className={`text-lg font-bold ${data.monthlySummary.savingsRate >= 20 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{data.monthlySummary.savingsRate}%</p></div>
        </div>
      </div>
    </div>
  );
}

export default NetWorthPage;
