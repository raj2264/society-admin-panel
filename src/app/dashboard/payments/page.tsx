"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, CreditCard, Receipt, AlertCircle, CheckCircle2, Calendar, DollarSign, FileText, RefreshCw, Download, Loader2, Plus } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { format } from "date-fns";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed" | "refunded";
  payment_method: string;
  created_at: string;
  completed_at: string | null;
  refunded_at: string | null;
  refund_amount: number | null;
  refund_reason: string | null;
  razorpay_payment_id: string | null;
  razorpay_order_id: string | null;
  society_id: string;
  residents: {
    unit_number: string;
    name: string;
    email: string;
  };
  maintenance_bills: {
    month_year: string;
    total_amount: number;
    status: string;
    bill_number: string;
  };
}

interface ReceiptData {
  receipt_number: string;
  payment_id: string;
  razorpay_payment_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  payment_date: string;
  card_last4?: string;
  card_network?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  resident: {
    name: string;
    email: string;
    phone: string;
    unit_number: string;
  };
  bill: {
    month_year: string;
    total_amount: number;
    due_date: string;
  };
  society: {
    name: string;
    address: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    case "refunded":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

// Generate month options: 6 future months + current + 12 past months
const getMonthOptions = () => {
  const options = [];
  const now = new Date();
  // Future months first (6 → 1)
  for (let i = 6; i >= 1; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    options.push({ value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") });
  }
  // Current + past 12 months
  for (let i = 0; i <= 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") });
  }
  return options;
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const router = useRouter();
  const monthOptions = getMonthOptions();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.push("/auth/login");
        return;
      }

      // Get society_id
      const { data: adminData } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (!adminData) {
        throw new Error("Not authorized as society admin");
      }

      // Fetch only completed payments (limited to 100 for performance)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(`
          *,
          residents!inner (
            unit_number,
            name,
            email
          ),
          maintenance_bills (
            month_year,
            total_amount,
            status,
            bill_number
          )
        `)
        .eq("society_id", adminData.society_id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(100);

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);
    } catch (error: any) {
      console.error("Error fetching payments:", error);
      setError(error.message || "Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const downloadReceipt = async (payment: Payment) => {
    try {
      setDownloadingId(payment.id);
      
      // Get session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      // Call Edge Function to get receipt data
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          },
          body: JSON.stringify({
            action: "get_receipt",
            payment_id: payment.id,
            society_id: payment.society_id,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch receipt");
      }

      const receipt: ReceiptData = data.receipt;

      // Generate HTML receipt for download
      const receiptHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Receipt - ${receipt.receipt_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; color: #333; }
    .header p { color: #666; margin: 5px 0; }
    .receipt-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .receipt-info div { flex: 1; }
    .section { margin-bottom: 25px; }
    .section-title { font-weight: bold; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; }
    .label { color: #666; }
    .value { font-weight: 500; }
    .amount-section { background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; }
    .total-row { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; margin-top: 10px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 0.9em; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; background: #22c55e; color: white; font-weight: bold; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>${receipt.society?.name || "Society"}</h1>
    <p>${receipt.society?.address || ""}</p>
    <h2 style="margin-top: 20px;">PAYMENT RECEIPT</h2>
  </div>
  
  <div class="receipt-info">
    <div>
      <p><strong>Receipt No:</strong> ${receipt.receipt_number}</p>
      <p><strong>Date:</strong> ${receipt.payment_date ? new Date(receipt.payment_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "N/A"}</p>
      <p><strong>Status:</strong> <span class="status-badge">${receipt.status.toUpperCase()}</span></p>
    </div>
    <div style="text-align: right;">
      <p><strong>Razorpay Payment ID:</strong></p>
      <p>${receipt.razorpay_payment_id || "N/A"}</p>
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Resident Details</div>
    <div class="row"><span class="label">Name:</span><span class="value">${receipt.resident?.name || "N/A"}</span></div>
    <div class="row"><span class="label">Unit/Flat:</span><span class="value">${receipt.resident?.unit_number || "N/A"}</span></div>
    <div class="row"><span class="label">Email:</span><span class="value">${receipt.resident?.email || "N/A"}</span></div>
    <div class="row"><span class="label">Phone:</span><span class="value">${receipt.resident?.phone || "N/A"}</span></div>
  </div>
  
  <div class="section">
    <div class="section-title">Bill Details</div>
    <div class="row"><span class="label">Bill Month:</span><span class="value">${receipt.bill?.month_year || "N/A"}</span></div>
    <div class="row"><span class="label">Due Date:</span><span class="value">${receipt.bill?.due_date ? new Date(receipt.bill.due_date).toLocaleDateString("en-IN") : "N/A"}</span></div>
  </div>
  
  <div class="section">
    <div class="section-title">Payment Details</div>
    <div class="row"><span class="label">Payment Method:</span><span class="value">${receipt.payment_method || "Online"}</span></div>
    ${receipt.card_last4 ? `<div class="row"><span class="label">Card:</span><span class="value">${receipt.card_network || ""} ****${receipt.card_last4}</span></div>` : ""}
    ${receipt.bank ? `<div class="row"><span class="label">Bank:</span><span class="value">${receipt.bank}</span></div>` : ""}
    ${receipt.wallet ? `<div class="row"><span class="label">Wallet:</span><span class="value">${receipt.wallet}</span></div>` : ""}
    ${receipt.vpa ? `<div class="row"><span class="label">UPI ID:</span><span class="value">${receipt.vpa}</span></div>` : ""}
  </div>
  
  <div class="amount-section">
    <div class="row total-row">
      <span>AMOUNT PAID</span>
      <span>₹${receipt.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 }) || "0.00"}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>This is a computer-generated receipt and does not require a signature.</p>
    <p>Thank you for your payment!</p>
  </div>
</body>
</html>`;

      // Create blob and download
      const blob = new Blob([receiptHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Receipt-${receipt.receipt_number}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error downloading receipt:", error);
      setError(error.message || "Failed to download receipt");
    } finally {
      setDownloadingId(null);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    // Month filter
    if (selectedMonth && selectedMonth !== "all") {
      const paymentMonth = payment.created_at ? format(new Date(payment.created_at), "yyyy-MM") : "";
      if (paymentMonth !== selectedMonth) return false;
    }
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        payment.residents.unit_number.toLowerCase().includes(searchLower) ||
        payment.residents.name.toLowerCase().includes(searchLower) ||
        payment.residents.email.toLowerCase().includes(searchLower) ||
        (payment.maintenance_bills?.month_year || "").toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Payments</h2>
          <p className="text-muted-foreground">
            View all payments and record manual payments
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/bills/payments">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Manual Payment
            </Button>
          </Link>
          <Button variant="outline" onClick={fetchPayments}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by flat number, resident name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No payments found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedMonth !== "all"
                  ? "Try selecting a different month or clearing your search"
                  : "Payments will appear here when residents make payments"}
              </p>
              {selectedMonth !== "all" && (
                <Button variant="outline" onClick={() => setSelectedMonth("all")}>
                  Show All Months
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">
                            {payment.residents.name} - Flat {payment.residents.unit_number}
                          </h3>
                          <Badge className={getStatusColor(payment.status)}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Bill #{payment.maintenance_bills?.bill_number || payment.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {payment.residents.email}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(payment.created_at), "dd MMM yyyy")}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(payment.amount)}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {payment.maintenance_bills.month_year}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm text-muted-foreground">
                          {payment.payment_method && (
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {payment.payment_method.toUpperCase().replace('_', ' ')}
                              {!payment.razorpay_payment_id && " (Manual)"}
                            </div>
                          )}
                          {payment.completed_at && (
                            <div>
                              Completed: {format(new Date(payment.completed_at), "dd MMM yyyy")}
                            </div>
                          )}
                          {payment.refunded_at && (
                            <div className="text-red-500">
                              Refunded: {format(new Date(payment.refunded_at), "dd MMM yyyy")}
                              {payment.refund_amount && (
                                <div>Amount: {formatCurrency(payment.refund_amount)}</div>
                              )}
                              {payment.refund_reason && (
                                <div className="text-xs">Reason: {payment.refund_reason}</div>
                              )}
                            </div>
                          )}
                        </div>
                        {payment.status === "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadReceipt(payment)}
                            disabled={downloadingId === payment.id}
                          >
                            {downloadingId === payment.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4 mr-2" />
                            )}
                            Download Receipt
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 