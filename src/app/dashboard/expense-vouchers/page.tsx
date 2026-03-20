'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { format, startOfMonth, subMonths, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Pencil, Trash2, Download } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';

interface MonthlyBalance {
  id: string;
  month: string;
  opening_balance: number;
  closing_balance: number;
}

interface ExpenseVoucher {
  id: string;
  voucher_number: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  payment_mode: string;
  payment_details: Record<string, any>;
}

export default function ExpenseVouchersPage() {
  const router = useRouter();
  const [societyId, setSocietyId] = useState<string | null>(null);
  const [monthlyBalance, setMonthlyBalance] = useState<MonthlyBalance | null>(null);
  const [expenses, setExpenses] = useState<ExpenseVoucher[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSetBalanceOpen, setIsSetBalanceOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newExpense, setNewExpense] = useState({
    voucher_number: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    amount: '',
    category: '',
    payment_mode: '',
    payment_details: {}
  });
  const [openingBalance, setOpeningBalance] = useState('');
  const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
  const [isDeleteExpenseOpen, setIsDeleteExpenseOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseVoucher | null>(null);
  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState(false);

  // Function to change month
  const changeMonth = (direction: 'prev' | 'next') => {
    setSelectedDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  // Initial data fetch
  useEffect(() => {
    const fetchSocietyId = async () => {
      try {
        setIsLoading(true);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast.error('Authentication error. Please try logging in again.');
          router.push('/auth/login');
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to login');
          router.push('/auth/login');
          return;
        }

        const { data: adminData, error: adminError } = await supabase
          .from('society_admins')
          .select('society_id')
          .eq('user_id', session.user.id)
          .single();

        if (adminError) {
          console.error('Error fetching admin data:', adminError);
          toast.error('Failed to fetch society data');
          return;
        }

        if (adminData) {
          setSocietyId(adminData.society_id);
          await fetchMonthlyBalance(adminData.society_id);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        toast.error('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSocietyId();
  }, [router]);

  // Effect to fetch data when month changes
  useEffect(() => {
    if (societyId) {
      fetchMonthlyBalance(societyId);
    }
  }, [selectedDate]); // Only depend on selectedDate, not societyId

  const fetchMonthlyBalance = async (societyId: string) => {
    try {
      setIsLoading(true);
      const firstDayOfMonth = startOfMonth(selectedDate);
      const currentMonth = format(firstDayOfMonth, 'yyyy-MM-dd');
      
      console.log('Fetching monthly balance for:', { societyId, currentMonth });

      const { data: balance, error } = await supabase
        .from('monthly_balances')
        .select('*')
        .eq('society_id', societyId)
        .eq('month', currentMonth)
        .maybeSingle();

      if (error) {
        console.error('Error fetching monthly balance:', error);
        toast.error('Failed to fetch monthly balance');
        setMonthlyBalance(null);
        setExpenses([]);
        return;
      }

      if (balance) {
        console.log('Monthly balance found:', balance);
        setMonthlyBalance(balance);
        await fetchExpenses(balance.id);
      } else {
        console.log('No monthly balance found for:', currentMonth);
        setMonthlyBalance(null);
        setExpenses([]);
      }
    } catch (error) {
      console.error('Unexpected error in fetchMonthlyBalance:', error);
      toast.error('An unexpected error occurred while fetching balance');
      setMonthlyBalance(null);
      setExpenses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpenses = async (monthlyBalanceId: string) => {
    try {
      const { data: expenses, error } = await supabase
        .from('expense_vouchers')
        .select('*')
        .eq('monthly_balance_id', monthlyBalanceId)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
        toast.error('Failed to fetch expenses');
        setExpenses([]);
        return;
      }

      setExpenses(expenses || []);
    } catch (error) {
      console.error('Unexpected error in fetchExpenses:', error);
      toast.error('An unexpected error occurred while fetching expenses');
      setExpenses([]);
    }
  };

  const handleSetOpeningBalance = async () => {
    if (!societyId || !openingBalance) return;

    try {
      // Get the first day of the current month in ISO format
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonth = format(firstDayOfMonth, 'yyyy-MM-dd');

      console.log('Setting opening balance for:', { societyId, currentMonth, openingBalance });

      const { data, error } = await supabase
        .from('monthly_balances')
        .upsert({
          society_id: societyId,
          month: currentMonth,
          opening_balance: parseFloat(openingBalance),
          closing_balance: parseFloat(openingBalance)
        })
        .select()
        .single();

      if (error) {
        console.error('Error setting opening balance:', error);
        toast.error('Failed to set opening balance: ' + error.message);
        return;
      }

      if (!data) {
        console.error('No data returned after setting opening balance');
        toast.error('Failed to set opening balance: No data returned');
        return;
      }

      console.log('Opening balance set successfully:', data);
      setMonthlyBalance(data);
      setIsSetBalanceOpen(false);
      toast.success('Opening balance set successfully');
    } catch (error) {
      console.error('Unexpected error in handleSetOpeningBalance:', error);
      toast.error('An unexpected error occurred while setting balance');
    }
  };

  const handleAddExpense = async () => {
    console.log('handleAddExpense called');
    console.log('Current state:', { monthlyBalance, newExpense, societyId });

    if (!monthlyBalance || !newExpense.voucher_number || !newExpense.amount) {
      console.log('Validation failed:', { monthlyBalance, voucherNumber: newExpense.voucher_number, amount: newExpense.amount });
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // First, insert the expense
      const { data: expenseData, error: expenseError } = await supabase
        .from('expense_vouchers')
        .insert({
          society_id: societyId,
          monthly_balance_id: monthlyBalance.id,
          voucher_number: newExpense.voucher_number,
          date: newExpense.date,
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          category: newExpense.category,
          payment_mode: newExpense.payment_mode,
          payment_details: newExpense.payment_details
        })
        .select()
        .single();

      if (expenseError) {
        console.error('Error adding expense:', expenseError);
        toast.error('Failed to add expense: ' + expenseError.message);
        return;
      }

      if (!expenseData) {
        console.error('No expense data returned after insert');
        toast.error('Failed to add expense: No data returned');
        return;
      }

      // Update the monthly balance
      const newClosingBalance = monthlyBalance.closing_balance - parseFloat(newExpense.amount);
      const { data: updatedBalance, error: balanceError } = await supabase
        .from('monthly_balances')
        .update({ closing_balance: newClosingBalance })
        .eq('id', monthlyBalance.id)
        .select()
        .single();

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        toast.error('Expense added but failed to update balance');
        return;
      }

      if (!updatedBalance) {
        console.error('No balance data returned after update');
        toast.error('Failed to update balance: No data returned');
        return;
      }

      // Update local state
      setExpenses([expenseData, ...expenses]);
      setMonthlyBalance(updatedBalance);
      setIsAddExpenseOpen(false);
      setNewExpense({
        voucher_number: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        category: '',
        payment_mode: '',
        payment_details: {}
      });
      toast.success('Expense added successfully');
    } catch (error) {
      console.error('Unexpected error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleEditExpense = async () => {
    if (!selectedExpense || !monthlyBalance) return;

    try {
      const oldAmount = selectedExpense.amount;
      const newAmount = parseFloat(newExpense.amount);
      const balanceDifference = oldAmount - newAmount;

      // Update the expense
      const { data: updatedExpense, error: expenseError } = await supabase
        .from('expense_vouchers')
        .update({
          voucher_number: newExpense.voucher_number,
          date: newExpense.date,
          description: newExpense.description,
          amount: newAmount,
          category: newExpense.category,
          payment_mode: newExpense.payment_mode,
          payment_details: newExpense.payment_details
        })
        .eq('id', selectedExpense.id)
        .select()
        .single();

      if (expenseError) {
        console.error('Error updating expense:', expenseError);
        toast.error('Failed to update expense');
        return;
      }

      // Update the monthly balance
      const newClosingBalance = monthlyBalance.closing_balance + balanceDifference;
      const { data: updatedBalance, error: balanceError } = await supabase
        .from('monthly_balances')
        .update({ closing_balance: newClosingBalance })
        .eq('id', monthlyBalance.id)
        .select()
        .single();

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        toast.error('Expense updated but failed to update balance');
        return;
      }

      // Update local state
      setExpenses(expenses.map(exp => 
        exp.id === selectedExpense.id ? updatedExpense : exp
      ));
      setMonthlyBalance(updatedBalance);
      setIsEditExpenseOpen(false);
      setSelectedExpense(null);
      setNewExpense({
        voucher_number: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        amount: '',
        category: '',
        payment_mode: '',
        payment_details: {}
      });
      toast.success('Expense updated successfully');
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleDeleteExpense = async () => {
    if (!selectedExpense || !monthlyBalance) return;

    try {
      // Delete the expense
      const { error: deleteError } = await supabase
        .from('expense_vouchers')
        .delete()
        .eq('id', selectedExpense.id);

      if (deleteError) {
        console.error('Error deleting expense:', deleteError);
        toast.error('Failed to delete expense');
        return;
      }

      // Update the monthly balance
      const newClosingBalance = monthlyBalance.closing_balance + selectedExpense.amount;
      const { data: updatedBalance, error: balanceError } = await supabase
        .from('monthly_balances')
        .update({ closing_balance: newClosingBalance })
        .eq('id', monthlyBalance.id)
        .select()
        .single();

      if (balanceError) {
        console.error('Error updating balance:', balanceError);
        toast.error('Expense deleted but failed to update balance');
        return;
      }

      // Update local state
      setExpenses(expenses.filter(exp => exp.id !== selectedExpense.id));
      setMonthlyBalance(updatedBalance);
      setIsDeleteExpenseOpen(false);
      setSelectedExpense(null);
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleEditOpeningBalance = async () => {
    if (!societyId || !monthlyBalance) return;

    try {
      const { data: updatedBalance, error } = await supabase
        .from('monthly_balances')
        .update({
          opening_balance: parseFloat(openingBalance),
          closing_balance: parseFloat(openingBalance) - (monthlyBalance.opening_balance - monthlyBalance.closing_balance)
        })
        .eq('id', monthlyBalance.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating opening balance:', error);
        toast.error('Failed to update opening balance');
        return;
      }

      setMonthlyBalance(updatedBalance);
      setIsEditBalanceOpen(false);
      toast.success('Opening balance updated successfully');
    } catch (error) {
      console.error('Error updating opening balance:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const openEditExpenseDialog = (expense: ExpenseVoucher) => {
    setSelectedExpense(expense);
    setNewExpense({
      voucher_number: expense.voucher_number,
      date: expense.date,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      payment_mode: expense.payment_mode,
      payment_details: expense.payment_details || {}
    });
    setIsEditExpenseOpen(true);
  };

  const openDeleteExpenseDialog = (expense: ExpenseVoucher) => {
    setSelectedExpense(expense);
    setIsDeleteExpenseOpen(true);
  };

  const openEditBalanceDialog = () => {
    setOpeningBalance(monthlyBalance?.opening_balance.toString() || '');
    setIsEditBalanceOpen(true);
  };

  const downloadExcel = () => {
    if (!monthlyBalance || expenses.length === 0) {
      toast.error('No expenses to download');
      return;
    }

    try {
      // Prepare the data for Excel
      const excelData = expenses.map(expense => ({
        'Voucher Number': expense.voucher_number,
        'Date': format(new Date(expense.date), 'dd/MM/yyyy'),
        'Description': expense.description,
        'Category': expense.category.charAt(0).toUpperCase() + expense.category.slice(1),
        'Payment Mode': expense.payment_mode.replace('_', ' ').split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        'Amount': expense.amount
      }));

      // Add summary rows
      const summaryRows = [
        { 'Voucher Number': '', 'Date': '', 'Description': '', 'Category': '', 'Payment Mode': '', 'Amount': '' },
        { 'Voucher Number': 'Summary', 'Date': '', 'Description': '', 'Category': '', 'Payment Mode': '', 'Amount': '' },
        { 'Voucher Number': 'Opening Balance', 'Date': '', 'Description': '', 'Category': '', 'Payment Mode': '', 'Amount': monthlyBalance.opening_balance },
        { 'Voucher Number': 'Total Expenses', 'Date': '', 'Description': '', 'Category': '', 'Payment Mode': '', 'Amount': monthlyBalance.opening_balance - monthlyBalance.closing_balance },
        { 'Voucher Number': 'Closing Balance', 'Date': '', 'Description': '', 'Category': '', 'Payment Mode': '', 'Amount': monthlyBalance.closing_balance }
      ];

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet([...excelData, ...summaryRows]);

      // Set column widths
      const colWidths = [
        { wch: 15 }, // Voucher Number
        { wch: 12 }, // Date
        { wch: 40 }, // Description
        { wch: 15 }, // Category
        { wch: 15 }, // Payment Mode
        { wch: 15 }  // Amount
      ];
      ws['!cols'] = colWidths;

      // Add some styling to the summary rows
      const lastRow = excelData.length + summaryRows.length;
      for (let i = excelData.length + 1; i <= lastRow; i++) {
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
          const cellRef = `${col}${i}`;
          if (!ws[cellRef]) return;
          
          if (i === excelData.length + 2) { // Summary header
            ws[cellRef].s = { font: { bold: true, color: { rgb: "000000" } } };
          } else if (i > excelData.length + 2) { // Summary rows
            ws[cellRef].s = { font: { bold: true } };
            if (col === 'F') { // Amount column
              ws[cellRef].s.numFmt = '"₹"#,##0.00';
            }
          }
        });
      }

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

      // Generate Excel file
      const fileName = `Expenses_${format(selectedDate, 'MMMM_yyyy')}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Error generating Excel file:', error);
      toast.error('Failed to generate Excel file');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Expense Vouchers</h1>
          <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeMonth('prev')}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(selectedDate, 'MMMM yyyy')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => changeMonth('next')}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-3">
          {monthlyBalance && expenses.length > 0 && (
            <Button
              variant="outline"
              onClick={downloadExcel}
              className="min-w-[140px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Excel
            </Button>
          )}
          {!monthlyBalance && format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') ? (
            <Dialog open={isSetBalanceOpen} onOpenChange={setIsSetBalanceOpen}>
              <DialogTrigger asChild>
                <Button className="min-w-[140px]">Set Opening Balance</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Opening Balance for {format(selectedDate, 'MMMM yyyy')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSetOpeningBalance();
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="openingBalance">Opening Balance</Label>
                    <Input
                      id="openingBalance"
                      type="number"
                      value={openingBalance}
                      onChange={(e) => setOpeningBalance(e.target.value)}
                      placeholder="Enter opening balance"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsSetBalanceOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') && (
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button className="min-w-[140px]">Add Expense</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => {
                  console.log('Form submitted');
                  e.preventDefault();
                  handleAddExpense();
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="voucherNumber">Voucher Number</Label>
                    <Input
                      id="voucherNumber"
                      value={newExpense.voucher_number}
                      onChange={(e) => setNewExpense({ ...newExpense, voucher_number: e.target.value })}
                      placeholder="Enter voucher number"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                      placeholder="Enter expense description"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      placeholder="Enter amount"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newExpense.category}
                      onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="utilities">Utilities</SelectItem>
                        <SelectItem value="staff">Staff Salary</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <Select
                      value={newExpense.payment_mode}
                      onValueChange={(value) => setNewExpense({ ...newExpense, payment_mode: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAddExpenseOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Save Expense</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Loading expense data...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {monthlyBalance ? (
            <>
              {/* Balance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-medium text-muted-foreground">Opening Balance</CardTitle>
                    {format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') && (
                      <Button variant="ghost" size="sm" onClick={openEditBalanceDialog} className="h-8 w-8 p-0">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tracking-tight">₹{monthlyBalance.opening_balance.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-muted-foreground">Total Expenses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tracking-tight text-destructive">
                      ₹{(monthlyBalance.opening_balance - monthlyBalance.closing_balance).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium text-muted-foreground">Closing Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tracking-tight text-emerald-600">
                      ₹{monthlyBalance.closing_balance.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Expense List */}
              <Card className="bg-card shadow-sm">
                <CardHeader className="border-b">
                  <CardTitle className="text-lg">Expense List</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="relative overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[120px]">Voucher No.</TableHead>
                          <TableHead className="w-[100px]">Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[120px]">Category</TableHead>
                          <TableHead className="w-[120px]">Payment Mode</TableHead>
                          <TableHead className="w-[120px] text-right">Amount</TableHead>
                          {format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') && (
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => (
                          <TableRow key={expense.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">{expense.voucher_number}</TableCell>
                            <TableCell>{format(new Date(expense.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{expense.description}</TableCell>
                            <TableCell className="capitalize">{expense.category}</TableCell>
                            <TableCell className="capitalize">{expense.payment_mode.replace('_', ' ')}</TableCell>
                            <TableCell className="text-right font-medium">₹{expense.amount.toFixed(2)}</TableCell>
                            {format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') && (
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditExpenseDialog(expense)}
                                    className="h-8 w-8 p-0 hover:bg-muted"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openDeleteExpenseDialog(expense)}
                                    className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                        {expenses.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') ? 7 : 6} className="h-24 text-center">
                              <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <p className="text-sm">No expenses recorded for {format(selectedDate, 'MMMM yyyy')}</p>
                                {format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') && (
                                  <Button
                                    variant="link"
                                    onClick={() => setIsAddExpenseOpen(true)}
                                    className="mt-2"
                                  >
                                    Add your first expense
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card shadow-sm">
              <CardContent className="py-16">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    {format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM')
                      ? 'No opening balance set for this month. Set an opening balance to start recording expenses.'
                      : `No data available for ${format(selectedDate, 'MMMM yyyy')}`}
                  </p>
                  {format(selectedDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM') && (
                    <Button onClick={() => setIsSetBalanceOpen(true)} size="lg">
                      Set Opening Balance
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Edit Opening Balance Dialog */}
      <Dialog open={isEditBalanceOpen} onOpenChange={setIsEditBalanceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Opening Balance</DialogTitle>
            <DialogDescription>
              Update the opening balance for {format(selectedDate, 'MMMM yyyy')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleEditOpeningBalance();
          }} className="space-y-4">
            <div>
              <Label htmlFor="editOpeningBalance">Opening Balance</Label>
              <Input
                id="editOpeningBalance"
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="Enter opening balance"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditBalanceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditExpenseOpen} onOpenChange={setIsEditExpenseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>
              Update the expense details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleEditExpense();
          }} className="space-y-4">
            <div>
              <Label htmlFor="voucherNumber">Voucher Number</Label>
              <Input
                id="voucherNumber"
                value={newExpense.voucher_number}
                onChange={(e) => setNewExpense({ ...newExpense, voucher_number: e.target.value })}
                placeholder="Enter voucher number"
                required
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="Enter expense description"
                required
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="Enter amount"
                required
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={newExpense.category}
                onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="staff">Staff Salary</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Select
                value={newExpense.payment_mode}
                onValueChange={(value) => setNewExpense({ ...newExpense, payment_mode: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Expense Confirmation Dialog */}
      <AlertDialog open={isDeleteExpenseOpen} onOpenChange={setIsDeleteExpenseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense
              and update the monthly balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 