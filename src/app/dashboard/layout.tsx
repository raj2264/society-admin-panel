"use client";

import React, { useState, useMemo, useCallback, memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Home,
  Megaphone,
  FileText,
  Calendar,
  AlertTriangle,
  Shield,
  Phone,
  CreditCard,
  Car,
  Wallet,
  Info,
  Lock,
  BarChart2,
  UserCog,
  ChevronDown,
  Zap,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { ThemeToggle } from "../../components/theme-toggle";
import { AdminProvider, useAdmin } from "@/components/providers/admin-provider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  children?: { title: string; href: string }[];
}

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: Home }],
  },
  {
    label: "Finance",
    items: [
      {
        title: "Bills",
        href: "/dashboard/bills",
        icon: FileText,
        children: [
          { title: "Templates", href: "/dashboard/bills/templates" },
          { title: "Components", href: "/dashboard/bills/components" },
          { title: "Generate Bills", href: "/dashboard/bills/generate" },
          { title: "View Bills", href: "/dashboard/bills/view" },
          { title: "Record Payment", href: "/dashboard/bills/payments" },
          { title: "Revenue", href: "/dashboard/bills/revenue" },
          { title: "Settlements", href: "/dashboard/bills/settlements" },
        ],
      },
      { title: "Payments", href: "/dashboard/payments", icon: Wallet },
      { title: "Expense Vouchers", href: "/dashboard/expense-vouchers", icon: CreditCard },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Residents", href: "/dashboard/residents", icon: Users },
      { title: "Vehicles", href: "/dashboard/vehicles", icon: Car },
      { title: "EV Charging", href: "/dashboard/ev-charging", icon: Zap },
      { title: "Announcements", href: "/dashboard/announcements", icon: Megaphone },
      { title: "Complaints", href: "/dashboard/complaints", icon: AlertTriangle },
      { title: "Polls", href: "/dashboard/polls", icon: BarChart2 },
      { title: "Meetings", href: "/dashboard/meetings", icon: Calendar },
    ],
  },
  {
    label: "Security",
    items: [
      { title: "Guards", href: "/dashboard/guards", icon: Shield },
      { title: "Emergency Contacts", href: "/dashboard/security-contacts", icon: Phone },
    ],
  },
  {
    label: "Documents",
    items: [{ title: "Documents", href: "/dashboard/documents", icon: FileText }],
  },
  {
    label: "Settings",
    items: [
      { title: "Profile", href: "/dashboard/profile", icon: UserCog },
      { title: "Change Password", href: "/dashboard/change-password", icon: Lock },
      { title: "About Us", href: "/dashboard/about", icon: Info },
    ],
  },
];

// Prefetchable link — triggers Next.js prefetch on hover/focus for instant navigation
const PrefetchLink = memo(function PrefetchLink({
  href,
  onClick,
  className,
  children,
  title,
}: {
  href: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  title?: string;
}) {
  const router = useRouter();
  const handleMouseEnter = useCallback(() => {
    router.prefetch(href);
  }, [href, router]);

  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onFocus={handleMouseEnter}
      className={className}
      title={title}
      prefetch={false}
    >
      {children}
    </Link>
  );
});

const SidebarNavItem = memo(function SidebarNavItem({
  item,
  pathname,
  isCollapsed,
  expandedItems,
  onToggle,
  onMobileClose,
}: {
  item: NavItem;
  pathname: string;
  isCollapsed: boolean;
  expandedItems: string[];
  onToggle: (title: string) => void;
  onMobileClose: () => void;
}) {
  const Icon = item.icon;
  const isActive = pathname === item.href;
  const hasChildren = !!item.children;
  const isExpanded = expandedItems.includes(item.title);
  const isChildActive =
    hasChildren &&
    item.children!.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
  const isHighlighted = isActive || isChildActive;

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => onToggle(item.title)}
          className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
            ${
              isHighlighted
                ? "bg-primary/10 text-primary dark:bg-primary/10 dark:text-blue-400"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }
            ${isCollapsed ? "justify-center px-2" : ""}
          `}
          title={isCollapsed ? item.title : undefined}
        >
          <Icon
            className={`h-[18px] w-[18px] shrink-0 transition-colors ${
              isHighlighted
                ? "text-blue-600 dark:text-blue-400"
                : "text-muted-foreground group-hover:text-foreground"
            }`}
          />
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate text-left">{item.title}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </button>
        {isExpanded && !isCollapsed && (
          <div className="mt-1 ml-4 space-y-0.5 border-l-2 border-muted pl-3 animate-fade-in">
            {item.children!.map((child) => {
              const childActive =
                pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <PrefetchLink
                  key={child.href}
                  href={child.href}
                  onClick={onMobileClose}
                  className={`block rounded-md px-3 py-2 text-[13px] font-medium transition-all duration-150
                    ${
                      childActive
                        ? "bg-primary/10 text-primary dark:text-blue-400"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  {child.title}
                </PrefetchLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <PrefetchLink
      href={item.href}
      onClick={onMobileClose}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150
        ${
          isHighlighted
            ? "bg-primary/10 text-primary dark:bg-primary/10 dark:text-blue-400"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }
        ${isCollapsed ? "justify-center px-2" : ""}
      `}
      title={isCollapsed ? item.title : undefined}
    >
      <Icon
        className={`h-[18px] w-[18px] shrink-0 transition-colors ${
          isHighlighted
            ? "text-blue-600 dark:text-blue-400"
            : "text-muted-foreground group-hover:text-foreground"
        }`}
      />
      {!isCollapsed && <span className="truncate">{item.title}</span>}
    </PrefetchLink>
  );
});

function DashboardLayoutInner({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["Bills"]);
  const pathname = usePathname();

  // Use shared admin context — no more duplicate fetch!
  const { societyData, adminName, signOut } = useAdmin();

  const toggleExpand = useCallback((title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  const pageTitle = useMemo(() => {
    if (pathname === "/dashboard") return "Dashboard";
    for (const section of navSections) {
      for (const item of section.items) {
        if (pathname === item.href) return item.title;
        if (item.children) {
          for (const child of item.children) {
            if (pathname === child.href || pathname.startsWith(child.href + "/"))
              return child.title;
          }
        }
      }
    }
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    return last
      ? last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "Dashboard";
  }, [pathname]);

  const sidebarContent = useMemo(
    () => (
      <div className="flex h-full flex-col">
        {/* Logo / Brand */}
        <div
          className={`flex items-center border-b border-border/50 ${
            isCollapsed ? "justify-center p-4" : "gap-3 px-5 py-5"
          }`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25">
            <Building2 className="h-5 w-5" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col overflow-hidden animate-fade-in">
              <span className="truncate text-sm font-bold tracking-tight text-foreground">
                {societyData?.name || "Society"}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">Admin Panel</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <SidebarNavItem
                    key={item.title}
                    item={item}
                    pathname={pathname || ""}
                    isCollapsed={isCollapsed}
                    expandedItems={expandedItems}
                    onToggle={toggleExpand}
                    onMobileClose={closeMobileSidebar}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/50 p-3">
          {!isCollapsed && (
            <div className="mb-3 rounded-lg bg-muted/50 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-semibold text-foreground">{adminName}</p>
            </div>
          )}
          <div className="flex items-center gap-1">
            {!isCollapsed && <ThemeToggle />}
            <Button
              variant="ghost"
              size="sm"
              className={`gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 dark:text-red-400 ${
                isCollapsed ? "w-full justify-center" : "flex-1 justify-start"
              }`}
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span>Sign Out</span>}
            </Button>
          </div>
        </div>
      </div>
    ),
    [isCollapsed, societyData, adminName, pathname, expandedItems, toggleExpand, closeMobileSidebar, signOut]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-out md:hidden
          ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="absolute right-3 top-4 z-10">
          <button
            onClick={closeMobileSidebar}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 ease-out
          ${isCollapsed ? "w-[68px]" : "w-[260px]"}
        `}
      >
        {sidebarContent}
        {/* Collapse toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 z-40 flex h-6 w-6 items-center justify-center rounded-full border bg-card text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground transition-all"
        >
          <ChevronRight
            className={`h-3.5 w-3.5 transition-transform duration-200 ${
              isCollapsed ? "" : "rotate-180"
            }`}
          />
        </button>
      </aside>

      {/* Main area */}
      <div
        className={`transition-all duration-300 ease-out ${
          isCollapsed ? "md:pl-[68px]" : "md:pl-[260px]"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-4 md:px-6">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

// Wrap with AdminProvider so all dashboard children share the same admin data
export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AdminProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AdminProvider>
  );
} 