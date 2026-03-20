"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  IndianRupee,
  Landmark,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  SendHorizonal,
  Ban,
  FileText,
} from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Badge } from "../../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Textarea } from "../../../../components/ui/textarea";
import { Label } from "../../../../components/ui/label";
import { Separator } from "../../../../components/ui/separator";
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from "date-fns";

// ── Types ───────────────────────────────────────────────────────────────────

interface Settlement {
  id: string;
  society_id: string;
  month_year: string;
  razorpay_total: number;
  settlement_amount: number;
  platform_fee: number;
  status: "pending" | "processing" | "settled" | "disputed";
  settled_at: string | null;
  settlement_reference: string | null;
  notes: string | null;
  created_at: string;
}

interface EarlySettlementRequest {
  id: string;
  society_id: string;
  settlement_id: string | null;
  month_year: string;
  requested_amount: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "processed";
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 1; i--) {
    const d = addMonths(now, i);
    options.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy"),
    });
  }
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

const SETTLEMENT_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  processing: {
    label: "Processing",
    variant: "outline",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
  },
  settled: {
    label: "Settled",
    variant: "default",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  disputed: {
    label: "Disputed",
    variant: "destructive",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
};

const REQUEST_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: "Pending Review",
    variant: "secondary",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  approved: {
    label: "Approved",
    variant: "default",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    icon: <Ban className="h-3.5 w-3.5" />,
  },
  processed: {
    label: "Processed",
    variant: "outline",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
};

// ── Component ───────────────────────────────────────────────────────────────

export default function SettlementsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  // Data
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [earlyRequests, setEarlyRequests] = useState<EarlySettlementRequest[]>([]);
  const [razorpayTotal, setRazorpayTotal] = useState(0);
  const [razorpayCount, setRazorpayCount] = useState(0);

  // Early settlement request dialog
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Get session
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        router.push("/auth/login");
        return;
      }

      // Get society_id from admin
      const { data: adminData, error: adminError } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (adminError || !adminData) throw adminError || new Error("No admin data");

      const sid = adminData.society_id;
      setSocietyId(sid);

      // Parse month
      const [year, month] = selectedMonth.split("-").map(Number);
      const monthStart = startOfMonth(new Date(year, month - 1));
      const monthEnd = endOfMonth(new Date(year, month - 1));
      const monthStr = format(monthStart, "yyyy-MM-dd");

      // 1. Fetch Razorpay payment total for this month
      const { data: payments, error: payError } = await supabase
        .from("payments")
        .select("id, amount, razorpay_payment_id")
        .eq("society_id", sid)
        .eq("status", "completed")
        .not("razorpay_payment_id", "is", null)
        .gte("created_at", format(monthStart, "yyyy-MM-dd"))
        .lte("created_at", format(monthEnd, "yyyy-MM-dd") + "T23:59:59");

      if (payError) throw payError;

      const total = (payments || []).reduce(
        (sum: number, p: any) => sum + Number(p.amount),
        0
      );
      setRazorpayTotal(total);
      setRazorpayCount(payments?.length || 0);

      // 2. Fetch settlement records for this month
      const { data: settlementData, error: setError } = await supabase
        .from("payment_settlements")
        .select("*")
        .eq("society_id", sid)
        .gte("month_year", format(monthStart, "yyyy-MM-dd"))
        .lte("month_year", format(monthEnd, "yyyy-MM-dd"));

      if (setError) throw setError;
      setSettlements(settlementData || []);

      // 3. Fetch early settlement requests for this month
      const { data: requestData, error: reqError } = await supabase
        .from("early_settlement_requests")
        .select("*")
        .eq("society_id", sid)
        .gte("month_year", format(monthStart, "yyyy-MM-dd"))
        .lte("month_year", format(monthEnd, "yyyy-MM-dd"))
        .order("created_at", { ascending: false });

      if (reqError) {
        console.error("Error fetching early requests:", reqError);
        // Table might not exist yet — don't crash
      }
      setEarlyRequests(requestData || []);
    } catch (error) {
      console.error("Error fetching settlement data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Submit early settlement request ────────────────────────────────────

  const handleSubmitEarlyRequest = async () => {
    if (!societyId) return;
    try {
      setSubmittingRequest(true);

      const {
        data: sessionData,
      } = await supabase.auth.getSession();

      const [year, month] = selectedMonth.split("-").map(Number);
      const monthDate = format(new Date(year, month - 1, 1), "yyyy-MM-dd");

      const currentSettlement = settlements[0];

      const { error } = await supabase
        .from("early_settlement_requests")
        .insert({
          society_id: societyId,
          settlement_id: currentSettlement?.id || null,
          month_year: monthDate,
          requested_amount: razorpayTotal,
          reason: requestReason || null,
          requested_by: sessionData?.session?.user?.id || null,
          status: "pending",
        });

      if (error) {
        console.error("Error submitting early settlement request:", error);
        alert("Failed to submit request. Please try again.");
        return;
      }

      setIsRequestDialogOpen(false);
      setRequestReason("");
      await fetchData(true);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────

  const currentSettlement = settlements.length > 0 ? settlements[0] : null;

  const hasPendingEarlyRequest = useMemo(
    () => earlyRequests.some((r) => r.status === "pending"),
    [earlyRequests]
  );

  const allTimeSettled = useMemo(() => {
    return settlements
      .filter((s) => s.status === "settled")
      .reduce((sum, s) => sum + Number(s.settlement_amount), 0);
  }, [settlements]);

  // ── Loading ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  const settlementStatus = currentSettlement
    ? SETTLEMENT_STATUS_CONFIG[currentSettlement.status]
    : null;

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Viewing settlements for
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
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Razorpay Collections */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-700 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-blue-100 text-sm font-medium">
              Razorpay Collections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(razorpayTotal)}
            </p>
            <p className="text-xs text-blue-200 mt-1">
              {razorpayCount} {razorpayCount === 1 ? "payment" : "payments"}{" "}
              this month
            </p>
          </CardContent>
        </Card>

        {/* Settlement Status */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-700 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-emerald-100 text-sm font-medium">
              Settlement Amount
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {currentSettlement
                ? formatCurrency(Number(currentSettlement.settlement_amount))
                : "—"}
            </p>
            <p className="text-xs text-emerald-200 mt-1">
              {currentSettlement
                ? `Fee: ${formatCurrency(Number(currentSettlement.platform_fee))}`
                : "No settlement record yet"}
            </p>
          </CardContent>
        </Card>

        {/* Settlement Status Card */}
        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-500 to-purple-700 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-purple-100 text-sm font-medium">
              Status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {settlementStatus?.label || "Not Created"}
            </p>
            <p className="text-xs text-purple-200 mt-1">
              {currentSettlement?.settled_at
                ? `Settled on ${format(new Date(currentSettlement.settled_at), "dd MMM yyyy")}`
                : currentSettlement?.settlement_reference
                  ? `Ref: ${currentSettlement.settlement_reference}`
                  : "Settled at end of month by Razorpay"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            Settlement Details
          </CardTitle>
          <CardDescription>
            Monthly Razorpay payment settlement information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentSettlement ? (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead className="text-right">Razorpay Total</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead className="text-right">Settlement Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Settled On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        {format(
                          new Date(currentSettlement.month_year),
                          "MMMM yyyy"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          Number(currentSettlement.razorpay_total)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(
                          Number(currentSettlement.platform_fee)
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(
                          Number(currentSettlement.settlement_amount)
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={settlementStatus?.variant}
                          className="gap-1"
                        >
                          {settlementStatus?.icon}
                          {settlementStatus?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {currentSettlement.settlement_reference || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {currentSettlement.settled_at
                          ? format(
                              new Date(currentSettlement.settled_at),
                              "dd MMM yyyy"
                            )
                          : (
                            <span className="text-muted-foreground">—</span>
                          )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {currentSettlement.notes && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Notes
                  </p>
                  <p className="text-sm">{currentSettlement.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Landmark className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <h3 className="text-lg font-semibold">
                No settlement record yet
              </h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                {razorpayTotal > 0
                  ? "Your Razorpay collections for this month will be settled at the end of the month."
                  : "No Razorpay payments found for this month."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Early Settlement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SendHorizonal className="h-5 w-5 text-primary" />
            Early Settlement Request
          </CardTitle>
          <CardDescription>
            Request early settlement of your Razorpay collections before the
            standard month-end cycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          {razorpayTotal === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <IndianRupee className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                No Razorpay collections this month to request early settlement for.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">Available for Early Settlement</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(razorpayTotal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    From {razorpayCount} Razorpay{" "}
                    {razorpayCount === 1 ? "payment" : "payments"}
                  </p>
                </div>
                <Button
                  onClick={() => setIsRequestDialogOpen(true)}
                  disabled={hasPendingEarlyRequest}
                  className="gap-2"
                >
                  <ArrowUpRight className="h-4 w-4" />
                  {hasPendingEarlyRequest
                    ? "Request Pending"
                    : "Request Early Settlement"}
                </Button>
              </div>

              {hasPendingEarlyRequest && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  * You already have a pending early settlement request for this
                  month. You can submit a new one once the current request is
                  reviewed.
                </p>
              )}
            </div>
          )}

          {/* Previous requests list */}
          {earlyRequests.length > 0 && (
            <div className="mt-6">
              <Separator className="mb-4" />
              <h4 className="text-sm font-semibold mb-3">Your Requests</h4>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requested On</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Admin Notes</TableHead>
                      <TableHead>Reviewed On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earlyRequests.map((req) => {
                      const cfg =
                        REQUEST_STATUS_CONFIG[req.status] ||
                        REQUEST_STATUS_CONFIG.pending;
                      return (
                        <TableRow key={req.id}>
                          <TableCell className="text-sm">
                            {format(
                              new Date(req.created_at),
                              "dd MMM yyyy, hh:mm a"
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(Number(req.requested_amount))}
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {req.reason || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cfg.variant} className="gap-1">
                              {cfg.icon}
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">
                            {req.admin_notes || (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {req.reviewed_at
                              ? format(
                                  new Date(req.reviewed_at),
                                  "dd MMM yyyy"
                                )
                              : (
                                <span className="text-muted-foreground">—</span>
                              )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-semibold mb-1">How settlements work</p>
              <ul className="space-y-1 list-disc list-inside text-blue-700 dark:text-blue-300">
                <li>
                  Razorpay payments are automatically collected when residents
                  pay online.
                </li>
                <li>
                  At the end of each month, the total is settled to your
                  society&rsquo;s bank account.
                </li>
                <li>
                  A small platform/processing fee may be deducted from the
                  settlement.
                </li>
                <li>
                  If you need funds earlier, you can request an early settlement
                  which will be reviewed by the admin team.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Early Settlement Request Dialog */}
      <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Early Settlement</DialogTitle>
            <DialogDescription>
              Request early settlement of your Razorpay collections for{" "}
              {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Amount summary */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-xs text-muted-foreground">
                Settlement Amount Requested
              </p>
              <p className="text-xl font-bold mt-1">
                {formatCurrency(razorpayTotal)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                From {razorpayCount} Razorpay payments this month
              </p>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>
                Reason for Early Settlement{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Urgent maintenance work, vendor payment due, etc."
                rows={3}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Your request will be reviewed by the platform admin. You will be
              notified once it&rsquo;s processed.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRequestDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEarlyRequest}
              disabled={submittingRequest}
            >
              {submittingRequest && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
