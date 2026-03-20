"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FileText, Download, Send, Eye, Search, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../../../../lib/supabase";
import { toProxyUrl } from "../../../../lib/storage-proxy";
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
import { format, subMonths } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";

// Generate month options: 6 future months + current + 12 past months
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

export default function ViewBillsPage() {
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<MaintenanceBill[]>([]);
  const [selectedBill, setSelectedBill] = useState<MaintenanceBill | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    fetchBills();
  }, [statusFilter, dateFilter]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Session error:", sessionError);
        router.push("/auth/login");
        return;
      }
      
      if (!sessionData.session) {
        router.push("/auth/login");
        return;
      }

      // Get society_id
      const { data: adminData, error: adminError } = await supabase
        .from("society_admins")
        .select("society_id")
        .eq("user_id", sessionData.session.user.id)
        .single();

      if (adminError) {
        console.error("Admin data error:", adminError);
        throw adminError;
      }

      if (!adminData) {
        console.error("No admin data found");
        throw new Error("No admin data found");
      }

      // Build query
      const query = supabase
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
        .eq("society_id", adminData.society_id);

      // Apply filters
      if (statusFilter !== "all") {
        query.eq("status", statusFilter);
      }

      if (dateFilter && dateFilter !== "all") {
        // Parse the dateFilter (format: "yyyy-MM")
        const [year, month] = dateFilter.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1); // Month is 0-based in JS
        const endDate = new Date(year, month, 0); // Last day of the month

        query
          .gte("month_year", format(startDate, "yyyy-MM-dd"))
          .lte("month_year", format(endDate, "yyyy-MM-dd"));
      }

      // Add ordering
      query.order("bill_date", { ascending: false });

      const { data: billsData, error: billsError } = await query;

      if (billsError) {
        console.error("Bills fetch error:", billsError);
        throw billsError;
      }

      console.log("Fetched bills:", billsData); // Debug log
      setBills(billsData || []);
    } catch (error) {
      console.error("Error fetching bills:", error);
      setBills([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (bill: MaintenanceBill) => {
    setSelectedBill(bill);
    setIsDetailsOpen(true);
  };

  const handleDownloadPDF = async (bill: MaintenanceBill) => {
    try {
      // If PDF doesn't exist, generate it
      if (!bill.pdf_url) {
        console.log('Generating PDF for bill:', bill.id);
        const response = await fetch('/api/bills/generate-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ billId: bill.id }),
        });

        console.log('API Response status:', response.status);
        const responseData = await response.json();
        console.log('API Response data:', responseData);

        if (!response.ok) {
          throw new Error(`Failed to generate PDF: ${responseData.error || 'Unknown error'}`);
        }

        const { pdfUrl } = responseData;
        if (!pdfUrl) {
          throw new Error('No PDF URL returned from the server');
        }

        bill.pdf_url = pdfUrl;
        console.log('PDF generated successfully:', pdfUrl);
      }

      // Open PDF in new tab
      if (!bill.pdf_url) {
        throw new Error('PDF URL is still null after generation');
      }
      const proxyUrl = toProxyUrl(bill.pdf_url);
      console.log('Opening PDF:', proxyUrl);
      window.open(proxyUrl, '_blank');
    } catch (error) {
      console.error('Error handling PDF:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate or download PDF',
        variant: 'destructive',
      });
    }
  };

  const handleResendBill = async (bill: MaintenanceBill) => {
    try {
      const { error } = await supabase.rpc("send_bill_to_resident", {
        p_bill_id: bill.id,
      });

      if (error) throw error;

      // Refresh bills to update sent_at timestamp
      await fetchBills();
    } catch (error) {
      console.error("Error resending bill:", error);
    }
  };

  const filteredBills = bills.filter((bill) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const resident = bill.residents as any; // Type assertion for joined data
    
    return (
      bill.bill_number.toLowerCase().includes(searchLower) ||
      resident.name.toLowerCase().includes(searchLower) ||
      resident.unit_number.toLowerCase().includes(searchLower)
    );
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const getBadgeVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
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
          <h2 className="text-2xl font-semibold tracking-tight">View Bills</h2>
          <p className="text-muted-foreground">
            View and manage all maintenance bills
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Bills
          </CardTitle>
          <CardDescription>
            View and manage maintenance bills for your society
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by bill number, resident name, or unit number"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-40">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {MONTH_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {filteredBills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No bills found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || dateFilter
                  ? "Try adjusting your search or filters"
                  : "No bills have been generated yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Number</TableHead>
                    <TableHead>Resident</TableHead>
                    <TableHead>Unit Number</TableHead>
                    <TableHead>Bill Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.map((bill) => {
                    const resident = bill.residents as any; // Type assertion for joined data
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">
                          {bill.bill_number}
                        </TableCell>
                        <TableCell>{resident.name}</TableCell>
                        <TableCell>{resident.unit_number}</TableCell>
                        <TableCell>
                          {format(new Date(bill.bill_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {format(new Date(bill.due_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(bill.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getBadgeVariant(bill.status)}
                          >
                            {bill.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(bill)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDownloadPDF(bill)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleResendBill(bill)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedBill && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Bill Details</DialogTitle>
              <DialogDescription>
                Detailed information about the maintenance bill
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Bill Number</Label>
                  <div className="text-sm font-medium">{selectedBill.bill_number}</div>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <div>
                    <Badge
                      variant={getBadgeVariant(selectedBill.status)}
                    >
                      {selectedBill.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Bill Date</Label>
                  <div className="text-sm">
                    {format(new Date(selectedBill.bill_date), "dd MMM yyyy")}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <div className="text-sm">
                    {format(new Date(selectedBill.due_date), "dd MMM yyyy")}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Total Amount</Label>
                  <div className="text-sm font-medium">
                    {formatCurrency(selectedBill.total_amount)}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Late Fee</Label>
                  <div className="text-sm">
                    {selectedBill.late_fee_percentage}%
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-xs">Components</Label>
                <div className="mt-2 space-y-2">
                  {Object.entries(selectedBill.bill_components).map(
                    ([id, component]: [string, any]) => (
                      <div
                        key={id}
                        className="flex items-center justify-between py-2 border-b"
                      >
                        <div>
                          <div className="font-medium">{component.name}</div>
                          {component.is_percentage && (
                            <div className="text-sm text-muted-foreground">
                              {component.amount}% of {formatCurrency(component.base_amount)}
                            </div>
                          )}
                        </div>
                        <div className="font-medium">
                          {formatCurrency(component.amount)}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {selectedBill.payment_history.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-xs">Payment History</Label>
                    <div className="mt-2 space-y-2">
                      {selectedBill.payment_history.map((payment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between py-2 border-b"
                        >
                          <div>
                            <div className="font-medium">
                              {format(new Date(payment.date), "dd MMM yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {payment.mode}
                              {payment.transaction_id &&
                                ` - ${payment.transaction_id}`}
                            </div>
                            {payment.notes && (
                              <div className="text-sm text-muted-foreground">
                                {payment.notes}
                              </div>
                            )}
                          </div>
                          <div className="font-medium">
                            {formatCurrency(payment.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between">
              <div className="flex gap-2">
                {selectedBill.pdf_url && (
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPDF(selectedBill)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleResendBill(selectedBill)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Resend Bill
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsDetailsOpen(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 