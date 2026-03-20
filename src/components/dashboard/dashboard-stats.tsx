import { Users, AlertCircle, Megaphone, ShieldCheck, TrendingUp, ArrowUpRight } from "lucide-react";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export function DashboardStats({ societyId, adminEmail }: { societyId: string | undefined; adminEmail: string | undefined }) {
  const { data: stats, isLoading } = useDashboardStats(societyId, adminEmail);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="h-3.5 w-20 bg-muted rounded-md animate-pulse" />
              <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            </div>
            <div className="h-8 w-14 bg-muted rounded-md animate-pulse mb-1.5" />
            <div className="h-3 w-24 bg-muted rounded-md animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Residents",
      value: stats?.totalResidents || 0,
      description: "Active members",
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/40",
      textColor: "text-blue-600 dark:text-blue-400",
      trend: "+12%",
    },
    {
      title: "Total Staff",
      value: stats?.totalStaff || 0,
      description: "Staff members",
      icon: ShieldCheck,
      gradient: "from-emerald-500 to-green-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/40",
      textColor: "text-emerald-600 dark:text-emerald-400",
      trend: "+3%",
    },
    {
      title: "Pending Approvals",
      value: stats?.pendingApprovals || 0,
      description: "Awaiting action",
      icon: AlertCircle,
      gradient: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/40",
      textColor: "text-amber-600 dark:text-amber-400",
      trend: null,
    },
    {
      title: "Total Complaints",
      value: stats?.totalComplaints || 0,
      description: "All time",
      icon: Megaphone,
      gradient: "from-rose-500 to-red-600",
      bgLight: "bg-rose-50 dark:bg-rose-950/40",
      textColor: "text-rose-600 dark:text-rose-400",
      trend: "-5%",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, index) => (
        <div
          key={index}
          className={`group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:shadow-lg hover:shadow-black/5 hover:border-border/80 animate-slide-up stagger-${index + 1}`}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {card.title}
            </p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bgLight}`}>
              <card.icon className={`h-4.5 w-4.5 ${card.textColor}`} />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
            </div>
            {card.trend && (
              <div className={`flex items-center gap-0.5 text-xs font-semibold ${card.trend.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                <ArrowUpRight className={`h-3 w-3 ${card.trend.startsWith('-') ? 'rotate-90' : ''}`} />
                {card.trend}
              </div>
            )}
          </div>
          {/* Decorative gradient bar at the bottom */}
          <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${card.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        </div>
      ))}
    </div>
  );
}
