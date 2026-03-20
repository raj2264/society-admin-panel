"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, CreditCard, Receipt, AlertCircle, CheckCircle2, Calendar, DollarSign, FileText, Download, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { MaintenanceBill } from "../../../../types/bills";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Textarea } from "../../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../../../../components/ui/alert";
import { Badge } from "../../../../components/ui/badge";
import { format } from "date-fns";

const getBadgeVariant = (status: string) => {
  switch (status) {
    case "paid":
      return "default";
    case "overdue":
      return "destructive";
    case "partially_paid":
      return "outline";
    default:
      return "secondary";
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

export default function RecordPaymentPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<MaintenanceBill | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    mode: "cash",
    transaction_id: "",
    notes: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const router = useRouter();
  const monthOptions = getMonthOptions();

  // Load all pending bills on page mount
  useEffect(() => {
    loadPendingBills();
  }, []);

  const loadPendingBills = async () => {
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
        setError("Not authorized as society admin");
        return;
      }

      setSocietyId(adminData.society_id);

      // Fetch unpaid/pending bills (limited to 100 for performance)
      const { data: billsData, error: billsError } = await supabase
        .from("maintenance_bills")
        .select(`
          *,
          residents (
            name,
            unit_number,
            email,
            phone
          )
        `)
        .eq("society_id", adminData.society_id)
        .in("status", ["pending", "unpaid", "partially_paid", "overdue"])
        .order("bill_date", { ascending: false })
        .limit(100);

      if (billsError) throw billsError;
      setBills(billsData || []);
    } catch (error: any) {
      console.error("Error loading bills:", error);
      setError(error.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  // Filter bills based on search term and month
  const filteredBills = bills.filter((bill) => {
    // Month filter
    if (selectedMonth && selectedMonth !== "all") {
      const billMonth = bill.month_year ? format(new Date(bill.month_year), "yyyy-MM") : "";
      if (billMonth !== selectedMonth) return false;
    }
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const resident = bill.residents as any;
      return (
        bill.bill_number?.toLowerCase().includes(search) ||
        resident?.unit_number?.toLowerCase().includes(search) ||
        resident?.name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill) return;

    try {
      setError(null);
      setSuccess(null);
      setLoading(true);

      const paymentAmount = parseFloat(paymentForm.amount);
      if (isNaN(paymentAmount) || paymentAmount <= 0) {
        throw new Error("Please enter a valid payment amount");
      }

      // Validate transaction ID for non-cash payments
      if (paymentForm.mode !== "cash" && !paymentForm.transaction_id.trim()) {
        throw new Error(`Please enter the ${
          paymentForm.mode === "cheque" ? "cheque number" : 
          paymentForm.mode === "dd" ? "DD number" : "transaction ID"
        }`);
      }

      // Always fetch society_id fresh to avoid stale state
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Please login to continue");
      }
      
      const { data: adminData } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();
      
      if (!adminData?.society_id) {
        throw new Error("Not authorized as society admin");
      }
      
      const currentSocietyId = adminData.society_id;
      setSocietyId(currentSocietyId);

      // Calculate new status
      let newStatus: "paid" | "partially_paid" | "pending" = "pending";
      const totalPaid =
        paymentAmount +
        selectedBill.payment_history.reduce(
          (sum, payment) => sum + payment.amount,
          0
        );

      if (totalPaid >= selectedBill.total_amount) {
        newStatus = "paid";
      } else if (totalPaid > 0) {
        newStatus = "partially_paid";
      }

      // First create a payment record in the payments table
      const { data: paymentRecord, error: paymentError } = await supabase
        .from("payments")
        .insert({
          society_id: currentSocietyId,
          resident_id: selectedBill.resident_id,
          bill_id: selectedBill.id,
          amount: paymentAmount,
          currency: "INR",
          status: "completed",
          payment_method: paymentForm.mode,
          payment_details: {
            transaction_id: paymentForm.transaction_id || null,
            notes: paymentForm.notes || null,
            recorded_by: "admin",
          },
          completed_at: new Date(paymentForm.date).toISOString(),
        })
        .select()
        .single();

      if (paymentError) {
        console.error("Payment record error:", paymentError);
        throw new Error("Failed to create payment record: " + paymentError.message);
      }
      
      setLastPaymentId(paymentRecord.id);

      // Add payment to history
      const newPaymentHistory = [
        ...selectedBill.payment_history,
        {
          amount: paymentAmount,
          date: paymentForm.date,
          mode: paymentForm.mode,
          transaction_id: paymentForm.transaction_id || undefined,
          notes: paymentForm.notes || undefined,
          payment_id: paymentRecord.id, // Link to payments table
        },
      ];

      // Update bill
      const { error: updateError } = await supabase
        .from("maintenance_bills")
        .update({
          status: newStatus,
          payment_history: newPaymentHistory,
        })
        .eq("id", selectedBill.id);

      if (updateError) throw updateError;

      setSuccess("Payment recorded successfully! Receipt is now available.");
      setIsPaymentDialogOpen(false);
      
      // Reset form
      setPaymentForm({
        amount: "",
        mode: "cash",
        transaction_id: "",
        notes: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });

      // Refresh bills list
      loadPendingBills();
    } catch (error: any) {
      setError(error.message || "Failed to record payment");
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = async (paymentId: string) => {
    try {
      setDownloadingReceipt(true);
      
      // Ensure we have societyId
      let currentSocietyId = societyId;
      if (!currentSocietyId) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const { data: adminData } = await supabase
            .from("society_admins")
            .select("society_id")
            .eq("user_id", sessionData.session.user.id)
            .single();
          if (adminData) {
            currentSocietyId = adminData.society_id;
            setSocietyId(currentSocietyId);
          }
        }
      }
      
      if (!currentSocietyId) {
        throw new Error("Unable to fetch society information");
      }
      
      // Get session for auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      // Fetch receipt data from Edge Function
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
            payment_id: paymentId,
            society_id: currentSocietyId,
          }),
        }
      );

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to fetch receipt");
      }

      const receipt = data.receipt;

      // Generate HTML receipt
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
      <p><strong>Status:</strong> <span class="status-badge">${receipt.status?.toUpperCase()}</span></p>
    </div>
    <div style="text-align: right;">
      <p><strong>Payment Method:</strong> ${receipt.payment_method?.toUpperCase() || "Cash"}</p>
      ${receipt.payment_details?.transaction_id ? `<p><strong>Reference No:</strong> ${receipt.payment_details.transaction_id}</p>` : ""}
    </div>
  </div>
  
  <div class="section">
    <div class="section-title">Resident Details</div>
    <div class="row"><span class="label">Name:</span><span class="value">${receipt.resident?.name || "N/A"}</span></div>
    <div class="row"><span class="label">Unit/Flat:</span><span class="value">${receipt.resident?.unit_number || "N/A"}</span></div>
    <div class="row"><span class="label">Email:</span><span class="value">${receipt.resident?.email || "N/A"}</span></div>
  </div>
  
  <div class="section">
    <div class="section-title">Bill Details</div>
    <div class="row"><span class="label">Bill Month:</span><span class="value">${receipt.bill?.month_year ? new Date(receipt.bill.month_year).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "N/A"}</span></div>
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

      // Download receipt
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
      setDownloadingReceipt(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleRecordPayment = (bill: MaintenanceBill) => {
    setSelectedBill(bill);
    setPaymentForm({
      ...paymentForm,
      amount: (
        bill.total_amount -
        bill.payment_history.reduce((sum, payment) => sum + payment.amount, 0)
      ).toString(),
    });
    setIsPaymentDialogOpen(true);
  };

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
          <h2 className="text-2xl font-semibold tracking-tight">Record Payment</h2>
          <p className="text-muted-foreground">
            Record manual payments for maintenance bills (Cash, Cheque, DD, etc.)
          </p>
        </div>
        <Button variant="outline" onClick={loadPendingBills} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{success}</span>
            {lastPaymentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadReceipt(lastPaymentId)}
                disabled={downloadingReceipt}
                className="ml-4"
              >
                {downloadingReceipt ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Receipt
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Pending Bills ({filteredBills.length})
          </CardTitle>
          <CardDescription>
            All pending, partially paid, and overdue bills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter by bill number, unit number, or resident name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
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

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">
                {searchTerm || selectedMonth !== "all" ? "No matching bills found" : "No pending bills"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedMonth !== "all"
                  ? "Try selecting a different month or clearing your search"
                  : "All bills have been paid! Great job."}
              </p>
              {selectedMonth !== "all" && (
                <Button variant="outline" onClick={() => setSelectedMonth("all")}>
                  Show All Months
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBills.map((bill) => {
                const resident = bill.residents as any; // Type assertion for joined data
                const totalPaid = bill.payment_history.reduce(
                  (sum, payment) => sum + payment.amount,
                  0
                );
                const remainingAmount = bill.total_amount - totalPaid;

                return (
                  <Card key={bill.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">
                              {resident.name} - Flat {resident.unit_number}
                            </h3>
                            <Badge
                              variant={getBadgeVariant(bill.status)}
                            >
                              {bill.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Bill #{bill.bill_number}
                          </p>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(bill.bill_date), "dd MMM yyyy")}
                            </div>
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              {formatCurrency(bill.total_amount)}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-sm text-muted-foreground">
                            {bill.status !== "paid" && (
                              <>
                                Paid: {formatCurrency(totalPaid)}
                                <br />
                                Remaining: {formatCurrency(remainingAmount)}
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {bill.status === "paid" && bill.payment_history.some((p: any) => p.payment_id) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const lastPayment = bill.payment_history.find((p: any) => p.payment_id);
                                  if ((lastPayment as any)?.payment_id) {
                                    downloadReceipt((lastPayment as any).payment_id);
                                  }
                                }}
                                disabled={downloadingReceipt}
                              >
                                {downloadingReceipt ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Download className="h-4 w-4 mr-2" />
                                )}
                                Receipt
                              </Button>
                            )}
                            <Button
                              onClick={() => handleRecordPayment(bill)}
                              disabled={bill.status === "paid"}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Record Payment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBill && (
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record payment for bill #{selectedBill.bill_number}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Payment Date</Label>
                  <div className="relative mt-1">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, date: e.target.value })
                      }
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label>Amount</Label>
                  <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-muted-foreground">₹</span>
                    </div>
                    <Input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm({ ...paymentForm, amount: e.target.value })
                      }
                      className="pl-8"
                      placeholder="Enter payment amount"
                    />
                  </div>
                </div>

                <div>
                  <Label>Payment Mode</Label>
                  <Select
                    value={paymentForm.mode}
                    onValueChange={(value) =>
                      setPaymentForm({ ...paymentForm, mode: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer / NEFT / RTGS</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="dd">Demand Draft (DD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {paymentForm.mode !== "cash" && (
                  <div>
                    <Label>
                      {paymentForm.mode === "cheque" ? "Cheque Number" : 
                       paymentForm.mode === "dd" ? "DD Number" : "Transaction ID"}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={paymentForm.transaction_id}
                      onChange={(e) =>
                        setPaymentForm({
                          ...paymentForm,
                          transaction_id: e.target.value,
                        })
                      }
                      placeholder={
                        paymentForm.mode === "upi"
                          ? "Enter UPI reference number"
                          : paymentForm.mode === "bank_transfer"
                          ? "Enter transaction reference / UTR number"
                          : paymentForm.mode === "cheque"
                          ? "Enter cheque number"
                          : "Enter DD number"
                      }
                      className="mt-1"
                      required
                    />
                  </div>
                )}

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, notes: e.target.value })
                    }
                    placeholder="Add any additional notes"
                    className="mt-1"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Record Payment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 