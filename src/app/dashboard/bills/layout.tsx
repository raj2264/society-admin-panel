"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";

const billTabs = [
  { name: "Templates", href: "/dashboard/bills/templates" },
  { name: "Components", href: "/dashboard/bills/components" },
  { name: "Generate", href: "/dashboard/bills/generate" },
  { name: "View Bills", href: "/dashboard/bills/view" },
  { name: "Record Payment", href: "/dashboard/bills/payments" },
  { name: "Revenue", href: "/dashboard/bills/revenue" },
  { name: "Settlements", href: "/dashboard/bills/settlements" },
];

export default function BillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bills Management</h1>
        <p className="text-muted-foreground">
          Manage maintenance bills, templates, and payments for your society
        </p>
      </div>

      <div className="border-b">
        <nav className="-mb-px flex space-x-8" aria-label="Bills">
          {billTabs.map((tab) => (
            <button
              key={tab.href}
              onClick={() => router.push(tab.href)}
              className={`
                whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                ${pathname === tab.href
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                }
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div>{children}</div>
    </div>
  );
} 