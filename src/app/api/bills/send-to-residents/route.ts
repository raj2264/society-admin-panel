import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { Resend } from 'resend';
import { format } from 'date-fns';

// Initialize Resend lazily to avoid build-time crashes when API key is not set
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export async function POST(request: Request) {
  try {
    console.log('Send bills to residents request received');
    const { billIds } = await request.json();

    if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
      return NextResponse.json(
        { error: 'Bill IDs are required' },
        { status: 400 }
      );
    }

    const results = [];
    for (const billId of billIds) {
      try {
        // Fetch bill data with resident and society information
        const { data: bill, error: billError } = await supabase
          .from('maintenance_bills')
          .select(`
            *,
            residents (
              name,
              email,
              unit_number
            ),
            societies (
              name
            )
          `)
          .eq('id', billId)
          .single();

        if (billError || !bill) {
          throw new Error(`Failed to fetch bill data: ${billError?.message || 'Bill not found'}`);
        }

        if (!bill.residents?.email) {
          throw new Error('Resident email not found');
        }

        if (!bill.pdf_url) {
          throw new Error('PDF not generated for this bill');
        }

        // Send email to resident
        const emailResponse = await getResend().emails.send({
          from: 'MySociety <no-reply@mysociety.app>',
          to: bill.residents.email,
          subject: `Maintenance Bill for ${format(new Date(bill.bill_date), 'MMMM yyyy')} - ${bill.societies.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1a365d;">Maintenance Bill - ${bill.societies.name}</h2>
              <p>Dear ${bill.residents.name},</p>
              <p>Please find attached your maintenance bill for ${format(new Date(bill.bill_date), 'MMMM yyyy')}.</p>
              
              <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #2d3748; margin-top: 0;">Bill Details:</h3>
                <p><strong>Bill Number:</strong> ${bill.bill_number}</p>
                <p><strong>Unit Number:</strong> ${bill.residents.unit_number}</p>
                <p><strong>Amount:</strong> ₹${bill.total_amount.toFixed(2)}</p>
                <p><strong>Due Date:</strong> ${format(new Date(bill.due_date), 'dd/MM/yyyy')}</p>
              </div>

              <p>You can view and download your bill by clicking the button below:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${(process.env.NEXT_PUBLIC_SITE_URL || '') + (bill.pdf_url?.startsWith('/api/') ? bill.pdf_url : `/api/storage/maintenance-bills/${bill.pdf_url?.split('/storage/v1/object/public/maintenance-bills/').pop() || ''}`)}" 
                   style="background-color: #3182ce; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Bill
                </a>
              </div>

              <p>For any queries regarding your bill, please contact your society administration.</p>
              
              <div style="color: #718096; font-size: 14px; margin-top: 40px;">
                <p>This is an automated email. Please do not reply to this email.</p>
              </div>
            </div>
          `
        });

        // Update bill status to indicate email sent
        const { error: updateError } = await supabase
          .from('maintenance_bills')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', billId);

        if (updateError) {
          throw new Error(`Failed to update bill status: ${updateError.message}`);
        }

        results.push({
          billId,
          success: true,
          email: bill.residents.email,
          emailId: (emailResponse as any).id
        });
      } catch (error) {
        console.error('Error processing bill:', billId, error);
        results.push({
          billId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results,
      totalSuccessful: results.filter(r => r.success).length,
      totalFailed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Error in send bills to residents:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send bills',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 