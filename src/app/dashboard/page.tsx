"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Users,
  Bell,
  Clipboard,
  Megaphone,
  MessageSquare,
  TrendingUp,
  Clock,
  Activity,
  ChevronRight,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import { Badge } from "../../components/ui/badge";
import { format } from "date-fns";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardStatsSkeleton } from "@/components/skeletons/dashboard-skeletons";
import { useAdmin } from "@/components/providers/admin-provider";
import { useDashboardStats } from "@/hooks/useDashboardStats";

export default function SocietyDashboardPage() {
  // Shared admin context — no more duplicate fetch!
  const { societyData, adminEmail, loading } = useAdmin();
  const societyId = societyData?.id;
  const societyName = societyData?.name || "";

  // React Query deduplicates this — same queryKey as DashboardStats component
  const { data: stats } = useDashboardStats(societyId, adminEmail);
  const recentAnnouncements = useMemo(() => (stats?.announcements || []).slice(0, 3), [stats?.announcements]);

  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        {/* Skeleton hero */}
        <div className="rounded-2xl bg-muted/50 h-[160px] animate-pulse" />
        {/* Skeleton stats */}
        <DashboardStatsSkeleton />
        {/* Skeleton quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-muted/30 p-4 h-[100px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      label: "Manage Residents",
      href: "/dashboard/residents",
      icon: Users,
      color: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50 dark:bg-blue-950/30",
      textColor: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "View Complaints",
      href: "/dashboard/complaints",
      icon: MessageSquare,
      color: "from-amber-500 to-orange-600",
      bgLight: "bg-amber-50 dark:bg-amber-950/30",
      textColor: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Announcements",
      href: "/dashboard/announcements",
      icon: Megaphone,
      color: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-50 dark:bg-violet-950/30",
      textColor: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Pending Approvals",
      href: "/dashboard/residents",
      icon: UserCheck,
      color: "from-emerald-500 to-green-600",
      bgLight: "bg-emerald-50 dark:bg-emerald-950/30",
      textColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "View Reports",
      href: "/dashboard/bills/revenue",
      icon: Clipboard,
      color: "from-rose-500 to-pink-600",
      bgLight: "bg-rose-50 dark:bg-rose-950/30",
      textColor: "text-rose-600 dark:text-rose-400",
    },
    {
      label: "Notifications",
      href: "/dashboard/announcements",
      icon: Bell,
      color: "from-cyan-500 to-teal-600",
      bgLight: "bg-cyan-50 dark:bg-cyan-950/30",
      textColor: "text-cyan-600 dark:text-cyan-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 md:p-8 text-white shadow-xl shadow-blue-600/20">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-blue-200" />
            <span className="text-sm font-medium text-blue-200">Welcome back</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
            {societyName}
          </h1>
          <p className="text-blue-100 text-sm md:text-base max-w-lg">
            Manage your society efficiently. Here&apos;s an overview of your community.
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -right-4 -bottom-12 h-32 w-32 rounded-full bg-indigo-400/20 blur-xl" />
      </div>

      {/* Stats Cards */}
      <DashboardStats societyId={societyId} adminEmail={adminEmail} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-muted-foreground" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link key={action.label} href={action.href}>
              <div className={`group relative rounded-xl border border-border/50 ${action.bgLight} p-4 text-center transition-all duration-200 hover:shadow-md hover:scale-[1.02] hover:border-border cursor-pointer`}>
                <div className={`mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} text-white shadow-sm`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-foreground leading-tight block">
                  {action.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Announcements - wider */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  Recent Announcements
                </CardTitle>
                <Link
                  href="/dashboard/announcements"
                  className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <Megaphone className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">No announcements yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Create your first announcement to keep residents informed
                  </p>
                  <Link href="/dashboard/announcements">
                    <Button size="sm" className="gap-1.5">
                      <Megaphone className="h-3.5 w-3.5" />
                      Create Announcement
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentAnnouncements.map((announcement, i) => (
                    <div
                      key={announcement.id}
                      className={`group rounded-xl border border-border/50 bg-muted/30 p-4 transition-all duration-200 hover:bg-muted/50 hover:border-border animate-slide-up stagger-${i + 1}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 leading-tight">
                          {announcement.title}
                          {announcement.is_important && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Important
                            </Badge>
                          )}
                        </h3>
                        <div className="flex items-center gap-1 text-muted-foreground shrink-0">
                          <Clock className="h-3 w-3" />
                          <span className="text-[11px] font-medium">
                            {format(new Date(announcement.created_at), "MMM d")}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {announcement.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Society Info & Status */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                Society Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Society", value: societyName, color: "text-foreground" },
                  { label: "Admin Email", value: adminEmail || "-", color: "text-primary" },
                  { label: "Role", value: "Society Admin", color: "text-emerald-600 dark:text-emerald-400" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                    <span className={`text-sm font-semibold ${item.color} truncate ml-4 max-w-[180px]`}>
                      {item.value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-medium text-muted-foreground">System Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                      Online
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                Activity Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 relative">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Coming Soon</p>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Activity analytics will appear here once more data is available
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 