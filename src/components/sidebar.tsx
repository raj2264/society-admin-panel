"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import {
  FileText,
  CreditCard,
  Receipt,
  Settings,
  Users,
  Bell,
  Calendar,
  Home,
  Menu,
  X,
  Car,
  Wallet,
  IndianRupee,
} from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  {
    name: "Bills",
    icon: FileText,
    children: [
      { name: "Templates", href: "/dashboard/bills/templates" },
      { name: "Components", href: "/dashboard/bills/components" },
      { name: "Generate Bills", href: "/dashboard/bills/generate" },
      { name: "View Bills", href: "/dashboard/bills/view" },
      { name: "Record Payment", href: "/dashboard/bills/payments" },
      { name: "Revenue", href: "/dashboard/bills/revenue" },
      { name: "Settlements", href: "/dashboard/bills/settlements" },
    ],
  },
  { name: "Payments", href: "/dashboard/payments", icon: IndianRupee },
  { name: "Expense Vouchers", href: "/dashboard/expense-vouchers", icon: Wallet },
  { name: "Residents", href: "/dashboard/residents", icon: Users },
  { name: "Vehicles", href: "/dashboard/vehicles", icon: Car },
  { name: "Staff", href: "/dashboard/staff", icon: Users },
  { name: "Notices", href: "/dashboard/notices", icon: Bell },
  { name: "Events", href: "/dashboard/events", icon: Calendar },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Add debugging to check if navigation items are being rendered
  useEffect(() => {
    console.log('Current pathname:', pathname);
    console.log('Navigation items:', navigation);
  }, [pathname]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={toggleSidebar}
      >
        {isSidebarOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-background border-r transition-transform duration-200 ease-in-out md:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center px-6">
          <span className="text-xl font-semibold">Society Admin</span>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item, index) => {
              // Add debugging for each item
              console.log(`Rendering item ${index}:`, item.name);

              if (item.children) {
                const isExpanded = expandedItems.includes(item.name);
                const isActive = item.children.some(
                  (child) => child.href === pathname
                );

                return (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleExpand(item.name)}
                      className={cn(
                        "flex items-center w-full px-3 py-2 text-sm font-medium rounded-md",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-primary/5"
                      )}
                    >
                      <item.icon className="h-5 w-5 mr-3 shrink-0" />
                      <span className="flex-1">{item.name}</span>
                      <svg
                        className={cn(
                          "h-5 w-5 transition-transform",
                          isExpanded && "transform rotate-90"
                        )}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className={cn(
                              "flex items-center pl-11 pr-3 py-2 text-sm font-medium rounded-md",
                              child.href === pathname
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-primary/5"
                            )}
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = item.href === pathname;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-primary/5"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
} 