import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { formatINR } from "@/utils/format";
import type { ApiResponse, DashboardOverview } from "@diary/shared";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function NetWorthCard({ netWorth }: { netWorth: DashboardOverview["netWorth"] }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-ocean-900 to-ocean-800 p-6 text-white shadow-lg dark:from-ocean-900 dark:to-ocean-800 lg:from-blue-700 lg:to-blue-800">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300 dark:text-sky-300 lg:text-blue-200">
        Total Net Worth
      </p>
      <p className="mt-2 text-4xl font-black tracking-tight">
        <AnimatedCounter
          value={netWorth.total}
          formatter={(v) => formatINR(v * 100)}
        />
      </p>
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-semibold text-green-300">
          ▲ assets ahead
        </span>
      </div>
      <div className="mt-4 flex gap-6">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Assets</p>
          <p className="mt-1 text-lg font-semibold text-green-400">
            {formatINR(netWorth.assets * 100)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Liabilities</p>
          <p className="mt-1 text-lg font-semibold text-red-400">
            {formatINR(netWorth.liabilities * 100)}
          </p>
        </div>
      </div>
    </div>
  );
}

function QuickStatCard({
  label,
  value,
  subtext,
  borderColor,
}: {
  label: string;
  value: string;
  subtext?: string;
  borderColor: string;
}) {
  return (
    <div className={cn(`rounded-xl bg-white dark:bg-white/[0.04] dark:border dark:border-white/[0.06] p-4 shadow-sm dark:shadow-none border-l-4`, borderColor)}>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-400">{subtext}</p>}
    </div>
  );
}

function formatNextDue(nextDueDate: string | null, nextDueDays: number | null): string | undefined {
  if (!nextDueDate || nextDueDays === null) return undefined;
  const date = new Date(nextDueDate);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const label = `${months[date.getMonth()]} ${date.getDate()}`;
  const daysLabel = nextDueDays === 0 ? "today" : nextDueDays === 1 ? "1 day" : `${nextDueDays} days`;
  return `Next: ${label} (${daysLabel})`;
}

function QuickStatsRow({ quickStats }: { quickStats: DashboardOverview["quickStats"] }) {
  const nextDueSubtext = formatNextDue(quickStats.nextDueDate, quickStats.nextDueDays);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <QuickStatCard
        label="Bank Balance"
        value={formatINR(quickStats.bankBalance * 100)}
        borderColor="border-blue-500"
      />
      <QuickStatCard
        label="Card Dues"
        value={formatINR(quickStats.cardDues * 100)}
        subtext={nextDueSubtext}
        borderColor="border-red-500"
      />
      <QuickStatCard
        label="Loan EMIs / mo"
        value={formatINR(quickStats.loanEmiTotal * 100)}
        borderColor="border-amber-500"
      />
      <QuickStatCard
        label="Family Members"
        value={String(quickStats.familyMemberCount)}
        borderColor="border-green-500"
      />
    </div>
  );
}

function daysLeftColor(daysLeft: number): string {
  if (daysLeft <= 3) return "text-red-600 font-semibold";
  if (daysLeft <= 7) return "text-amber-600 font-medium";
  return "text-slate-500";
}

function UpcomingDues({ dues }: { dues: DashboardOverview["upcomingDues"] }) {
  if (dues.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-white/[0.04] dark:border dark:border-white/[0.06] p-5 shadow-sm dark:shadow-none">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-3">Upcoming Dues</h2>
        <p className="text-sm text-slate-400 dark:text-slate-400">No upcoming dues.</p>
      </div>
    );
  }

  const sorted = [...dues].sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div className="rounded-xl bg-white dark:bg-white/[0.04] dark:border dark:border-white/[0.06] p-5 shadow-sm dark:shadow-none">
      <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-3">Upcoming Dues</h2>
      <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
        {sorted.map((item, idx) => (
          <li key={idx} className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-300">{item.name}</p>
              <p className={`text-xs mt-0.5 ${daysLeftColor(item.daysLeft)}`}>
                {item.daysLeft === 0
                  ? "Due today"
                  : item.daysLeft === 1
                  ? "Due tomorrow"
                  : item.daysLeft < 0
                  ? `Overdue by ${Math.abs(item.daysLeft)} days`
                  : `${item.daysLeft} days left`}
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-300">
              {formatINR(item.amount * 100)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NeedsAttention({ items }: { items: DashboardOverview["needsAttention"] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-white/[0.04] dark:border dark:border-white/[0.06] p-5 shadow-sm dark:shadow-none">
        <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-3">Needs Attention</h2>
        <p className="text-sm text-slate-400 dark:text-slate-400">Everything looks up to date.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white dark:bg-white/[0.04] dark:border dark:border-white/[0.06] p-5 shadow-sm dark:shadow-none">
      <h2 className="text-base font-semibold text-slate-800 dark:text-white mb-3">Needs Attention</h2>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li
            key={idx}
            className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 flex items-start justify-between gap-3"
          >
            <div>
              <p className="text-sm font-medium text-amber-900">{item.title}</p>
              <p className="text-xs text-amber-700 mt-0.5">{item.description}</p>
            </div>
            {item.entityId && item.entityType && (
              <a
                href={`/${item.entityType}`}
                className="shrink-0 text-xs font-medium text-amber-700 underline hover:text-amber-900"
              >
                Tap to update
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function OverviewPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiResponse<DashboardOverview>>("/dashboard/overview")
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error ?? "Failed to load dashboard data.");
        }
      })
      .catch((err: Error) => {
        setError(err.message ?? "Failed to load dashboard data.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-sm font-medium text-red-700">{error ?? "No data available."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Overview</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your family's financial snapshot.</p>
      </div>

      <NetWorthCard netWorth={data.netWorth} />

      <QuickStatsRow quickStats={data.quickStats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingDues dues={data.upcomingDues} />
        <NeedsAttention items={data.needsAttention} />
      </div>
    </div>
  );
}

export default OverviewPage;
