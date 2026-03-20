"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  TrendingUp,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  FileCheck,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Loader2,
  RefreshCw,
  WalletCards,
  Download,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Badge } from "../../../../components/ui/badge";
import { Separator } from "../../../../components/ui/separator";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

// ── Types ───────────────────────────────────────────────────────────────────

interface PaymentRecord {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  created_at: string;
  completed_at: string | null;
  payment_details: any;
  residents: {
    name: string;
    unit_number: string;
    email: string;
    phone: string;
  } | null;
  maintenance_bills: {
    bill_number: string;
    bill_date: string;
    total_amount: number;
    month_year: string;
  } | null;
}

interface MethodBreakdown {
  method: string;
  label: string;
  icon: React.ReactNode;
  total: number;
  count: number;
  color: string;
  bgColor: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  // Future months first (6 → 1)
  for (let i = 6; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    });
  }
  // Current + past 12 months
  for (let i = 0; i <= 12; i++) {
    const d = subMonths(now, i);
    options.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    });
  }
  return options;
}

const MONTH_OPTIONS = getMonthOptions();

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencyExact(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Map raw payment_method to a display category
function categorizeMethod(
  method: string | null,
  razorpayId: string | null
): string {
  if (razorpayId) return "razorpay";
  if (!method) return "other";
  const m = method.toLowerCase();
  if (m === "cash") return "cash";
  if (m === "upi") return "upi";
  if (m === "bank_transfer") return "bank_transfer";
  if (m === "cheque" || m === "dd") return "cheque_dd";
  if (m === "card" || m === "netbanking" || m === "wallet") return "razorpay";
  return "other";
}

const METHOD_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  razorpay: {
    label: "Razorpay (Online)",
    icon: <CreditCard className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
  },
  cash: {
    label: "Cash",
    icon: <Banknote className="h-5 w-5" />,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-950/40",
  },
  upi: {
    label: "UPI",
    icon: <Smartphone className="h-5 w-5" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/40",
  },
  bank_transfer: {
    label: "Bank Transfer",
    icon: <Building2 className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
  },
  cheque_dd: {
    label: "Cheque / DD",
    icon: <FileCheck className="h-5 w-5" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
  },
  other: {
    label: "Other",
    icon: <WalletCards className="h-5 w-5" />,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-950/40",
  },
};

// ── Component ───────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [prevMonthPayments, setPrevMonthPayments] = useState<PaymentRecord[]>(
    []
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM")
  );
  const [billStats, setBillStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    partiallyPaid: 0,
  });
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.push("/auth/login");
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (adminError || !adminData) throw adminError || new Error("No admin data");

      const societyId = adminData.society_id;

      // Parse selected month
      const [year, month] = selectedMonth.split("-").map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));

      // Previous month for comparison
      const prevMonth = subMonths(monthStart, 1);
      const prevMonthEnd = endOfMonth(prevMonth);

      // Fetch current month payments with resident & bill details
      const paymentSelect = `
        id, amount, payment_method, status, razorpay_payment_id, razorpay_order_id,
        created_at, completed_at, payment_details,
        residents ( name, unit_number, email, phone ),
        maintenance_bills ( bill_number, bill_date, total_amount, month_year )
      `;

      const { data: currentPayments, error: payError } = await supabase
        .from("payments")
        .select(paymentSelect)
        .eq("society_id", societyId)
        .eq("status", "completed")
        .gte("created_at", format(monthStart, "yyyy-MM-dd"))
        .lte("created_at", format(monthEnd, "yyyy-MM-dd") + "T23:59:59")
        .order("created_at", { ascending: false });

      if (payError) throw payError;

      // Fetch previous month payments for trend comparison
      const { data: prevPayments, error: prevError } = await supabase
        .from("payments")
        .select(
          "id, amount, payment_method, status, razorpay_payment_id, created_at, completed_at"
        )
        .eq("society_id", societyId)
        .eq("status", "completed")
        .gte("created_at", format(prevMonth, "yyyy-MM-dd"))
        .lte("created_at", format(prevMonthEnd, "yyyy-MM-dd") + "T23:59:59");

      if (prevError) throw prevError;

      // Fetch bill stats for this month
      const { data: bills, error: billError } = await supabase
        .from("maintenance_bills")
        .select("id, status, total_amount")
        .eq("society_id", societyId)
        .gte("month_year", format(monthStart, "yyyy-MM-dd"))
        .lte("month_year", format(monthEnd, "yyyy-MM-dd"));

      if (billError) throw billError;

      const stats = {
        total: bills?.length || 0,
        paid: bills?.filter((b: any) => b.status === "paid").length || 0,
        pending: bills?.filter((b: any) => b.status === "pending").length || 0,
        overdue: bills?.filter((b: any) => b.status === "overdue").length || 0,
        partiallyPaid:
          bills?.filter((b: any) => b.status === "partially_paid").length || 0,
      };

      setPayments(currentPayments || []);
      setPrevMonthPayments(prevPayments || []);
      setBillStats(stats);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Export CSV ──────────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (payments.length === 0) return;

    const headers = [
      "Resident Name",
      "Unit Number",
      "Email",
      "Phone",
      "Bill Number",
      "Bill Date",
      "Bill Amount",
      "Payment Amount",
      "Payment Method",
      "Payment Category",
      "Razorpay Payment ID",
      "Razorpay Order ID",
      "Transaction ID",
      "Payment Date",
      "Completed At",
      "Notes",
    ];

    const escapeCSV = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const rows = payments.map((p) => {
      const resident = p.residents as any;
      const bill = p.maintenance_bills as any;
      const details = p.payment_details || {};
      const cat = categorizeMethod(p.payment_method, p.razorpay_payment_id);
      const catLabel = METHOD_CONFIG[cat]?.label || cat;

      return [
        resident?.name || "—",
        resident?.unit_number || "—",
        resident?.email || "—",
        resident?.phone || "—",
        bill?.bill_number || "—",
        bill?.bill_date ? format(new Date(bill.bill_date), "dd MMM yyyy") : "—",
        bill?.total_amount?.toString() || "—",
        Number(p.amount).toFixed(2),
        p.payment_method || "—",
        catLabel,
        p.razorpay_payment_id || "—",
        p.razorpay_order_id || "—",
        details.transaction_id || "—",
        p.created_at ? format(new Date(p.created_at), "dd MMM yyyy hh:mm a") : "—",
        p.completed_at ? format(new Date(p.completed_at), "dd MMM yyyy hh:mm a") : "—",
        details.notes || "—",
      ].map((v) => escapeCSV(String(v)));
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `revenue_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Derived data ────────────────────────────────────────────────────────

  const totalCollected = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount), 0),
    [payments]
  );

  const prevTotalCollected = useMemo(
    () => prevMonthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    [prevMonthPayments]
  );

  const trendPercent = useMemo(() => {
    if (prevTotalCollected === 0) return totalCollected > 0 ? 100 : 0;
    return ((totalCollected - prevTotalCollected) / prevTotalCollected) * 100;
  }, [totalCollected, prevTotalCollected]);

  const methodBreakdown: MethodBreakdown[] = useMemo(() => {
    const buckets: Record<string, { total: number; count: number }> = {};

    for (const p of payments) {
      const cat = categorizeMethod(p.payment_method, p.razorpay_payment_id);
      if (!buckets[cat]) buckets[cat] = { total: 0, count: 0 };
      buckets[cat].total += Number(p.amount);
      buckets[cat].count += 1;
    }

    // Order: razorpay, cash, upi, bank_transfer, cheque_dd, other
    const order = [
      "razorpay",
      "cash",
      "upi",
      "bank_transfer",
      "cheque_dd",
      "other",
    ];

    return order
      .filter((key) => buckets[key])
      .map((key) => ({
        method: key,
        ...METHOD_CONFIG[key],
        ...buckets[key],
      }));
  }, [payments]);

  const totalTransactions = payments.length;
  const collectionRate =
    billStats.total > 0
      ? Math.round(
          ((billStats.paid + billStats.partiallyPaid) / billStats.total) * 100
        )
      : 0;

  // ── Loading state ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Revenue Overview
          </h2>
          <p className="text-muted-foreground">
            Track payment collections by method for your society
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={payments.length === 0}
            title="Export payment data as CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Collected */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-100 text-sm font-medium">
              Total Collected
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {formatCurrency(totalCollected)}
                </p>
                <div className="flex items-center gap-1 mt-1 text-sm text-emerald-100">
                  {trendPercent >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span>
                    {Math.abs(trendPercent).toFixed(1)}%{" "}
                    {trendPercent >= 0 ? "more" : "less"} than last month
                  </span>
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <IndianRupee className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Transactions */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100 text-sm font-medium">
              Total Transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {totalTransactions}
                </p>
                <p className="text-sm text-blue-100 mt-1">
                  Completed payments this month
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Collection Rate */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-violet-500 to-violet-700 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-violet-100 text-sm font-medium">
              Collection Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold tracking-tight">
                  {collectionRate}%
                </p>
                <p className="text-sm text-violet-100 mt-1">
                  {billStats.paid} of {billStats.total} bills paid
                </p>
              </div>
              <div className="p-3 bg-white/20 rounded-xl">
                <FileCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-primary" />
            Collection by Payment Method
          </CardTitle>
          <CardDescription>
            Breakdown of payments received through each channel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {methodBreakdown.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IndianRupee className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                No payments recorded for this month
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Visual bar overview */}
              {totalCollected > 0 && (
                <div className="flex h-4 rounded-full overflow-hidden">
                  {methodBreakdown.map((m) => {
                    const pct = (m.total / totalCollected) * 100;
                    const colorMap: Record<string, string> = {
                      razorpay: "bg-blue-500",
                      cash: "bg-green-500",
                      upi: "bg-purple-500",
                      bank_transfer: "bg-amber-500",
                      cheque_dd: "bg-orange-500",
                      other: "bg-gray-400",
                    };
                    return (
                      <div
                        key={m.method}
                        className={`${colorMap[m.method] || "bg-gray-400"} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${m.label}: ${formatCurrency(m.total)} (${pct.toFixed(1)}%)`}
                      />
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground pt-1">
                {methodBreakdown.map((m) => {
                  const dotColor: Record<string, string> = {
                    razorpay: "bg-blue-500",
                    cash: "bg-green-500",
                    upi: "bg-purple-500",
                    bank_transfer: "bg-amber-500",
                    cheque_dd: "bg-orange-500",
                    other: "bg-gray-400",
                  };
                  return (
                    <div key={m.method} className="flex items-center gap-1.5">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${dotColor[m.method]}`}
                      />
                      {m.label}
                    </div>
                  );
                })}
              </div>

              <Separator />

              {/* Method cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {methodBreakdown.map((m) => {
                  const pct =
                    totalCollected > 0
                      ? ((m.total / totalCollected) * 100).toFixed(1)
                      : "0";
                  return (
                    <div
                      key={m.method}
                      className={`flex items-start gap-4 rounded-xl border p-4 ${m.bgColor}`}
                    >
                      <div
                        className={`p-2.5 rounded-lg ${m.bgColor} ${m.color}`}
                      >
                        {m.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">
                          {m.label}
                        </p>
                        <p className="text-xl font-bold mt-0.5">
                          {formatCurrencyExact(m.total)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {m.count} payment{m.count !== 1 ? "s" : ""}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {pct}% of total
                          </span>
                        </div>
                        {m.method === "razorpay" && (
                          <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-2 leading-snug">
                            * Settled to society account at the end of every month
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bill Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-primary" />
            Bill Status Summary
          </CardTitle>
          <CardDescription>
            Status overview of all maintenance bills for the selected month
          </CardDescription>
        </CardHeader>
        <CardContent>
          {billStats.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                No bills generated for this month
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border p-4 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Bills
                </p>
                <p className="text-2xl font-bold">{billStats.total}</p>
              </div>
              <div className="rounded-xl border p-4 text-center bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900">
                <p className="text-sm text-green-600 dark:text-green-400 mb-1">
                  Paid
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {billStats.paid}
                </p>
              </div>
              <div className="rounded-xl border p-4 text-center bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900">
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
                  Pending
                </p>
                <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {billStats.pending}
                </p>
              </div>
              <div className="rounded-xl border p-4 text-center bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900">
                <p className="text-sm text-red-600 dark:text-red-400 mb-1">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {billStats.overdue}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
