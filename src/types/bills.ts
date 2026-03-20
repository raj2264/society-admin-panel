export interface BillTemplate {
  id: string;
  society_id: string;
  name: string;
  header_text?: string;
  footer_text?: string;
  logo_url?: string;
  bank_details?: {
    bank_name: string;
    account_number: string;
    ifsc_code: string;
    account_name: string;
    payment_qr_url?: string;
    payment_qr_file_name?: string;
  };
  terms_and_conditions?: string[];
  created_at: string;
  updated_at: string;
}

export interface BillComponent {
  id: string;
  society_id: string;
  name: string;
  description?: string;
  is_percentage: boolean;
  is_required: boolean;
  default_amount?: number;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceBill {
  id: string;
  society_id: string;
  resident_id: string;
  template_id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  month_year: string;
  total_amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'partially_paid';
  payment_history: Array<{
    amount: number;
    date: string;
    transaction_id?: string;
    mode: string;
    notes?: string;
  }>;
  bill_components: {
    [key: string]: {
      name: string;
      amount: number;
      is_percentage?: boolean;
      base_amount?: number;
    };
  };
  late_fee_percentage: number;
  pdf_url?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
  residents?: {
    name: string;
    unit_number: string;
    email: string;
    phone: string;
  };
}

export interface BillGenerationLog {
  id: string;
  society_id: string;
  admin_id: string;
  generation_date: string;
  total_bills: number;
  successful_bills: number;
  failed_bills: number;
  error_logs?: Array<{
    resident_id: string;
    error: string;
  }>;
  status: 'in_progress' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface BillGenerationRequest {
  template_id: string;
  bill_date: string;
  due_date: string;
  components: Array<{
    id: string;
    amount?: number;
  }>;
  late_fee_percentage?: number;
  send_immediately?: boolean;
} 