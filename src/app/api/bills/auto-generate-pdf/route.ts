import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { generateBillPDF, uploadPDFToStorage } from '@/lib/pdf-generator';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(request: Request) {
  try {
    console.log('Auto PDF generation request received');
    const { billIds } = await request.json();
    console.log('Bill IDs:', billIds);

    if (!billIds || !Array.isArray(billIds) || billIds.length === 0) {
      console.error('No bill IDs provided');
      return NextResponse.json(
        { error: 'Bill IDs are required' },
        { status: 400 }
      );
    }

    const results: any[] = [];
    for (const billId of billIds) {
      try {
        // Fetch bill data with all required information including society
        console.log('Fetching bill data for ID:', billId);
        const { data: bill, error: billError } = await supabase
          .from('maintenance_bills')
          .select(`
            *,
            residents (
              name,
              unit_number,
              email
            ),
            bill_templates (
              name,
              header_text,
              footer_text,
              logo_url,
              bank_details,
              terms_and_conditions
            ),
            societies (
              name
            )
          `)
          .eq('id', billId)
          .single();

        if (billError) {
          console.error('Error fetching bill data:', billError);
          results.push({ billId, success: false, error: billError.message });
          continue;
        }

        if (!bill) {
          console.error('No bill found with ID:', billId);
          results.push({ billId, success: false, error: 'Bill not found' });
          continue;
        }

        if (!bill.residents) {
          console.error('No resident data found for bill');
          results.push({ billId, success: false, error: 'Resident data not found' });
          continue;
        }

        if (!bill.bill_templates) {
          console.error('No template data found for bill');
          results.push({ billId, success: false, error: 'Template data not found' });
          continue;
        }

        if (!bill.societies) {
          console.error('No society data found for bill');
          results.push({ billId, success: false, error: 'Society data not found' });
          continue;
        }

        // Generate PDF
        console.log('Generating PDF...');
        const pdfBuffer = await generateBillPDF({
          id: bill.id,
          bill_number: bill.bill_number,
          bill_date: bill.bill_date,
          due_date: bill.due_date,
          total_amount: bill.total_amount,
          society_name: bill.societies.name,
          bill_components: bill.bill_components || {},
          resident: bill.residents,
          template: bill.bill_templates
        });

        // Upload PDF to storage
        console.log('Uploading PDF to storage...');
        const pdfUrl = await uploadPDFToStorage(pdfBuffer, billId);

        // Update bill record with PDF URL
        console.log('Updating bill record...');
        const { error: updateError } = await supabase
          .from('maintenance_bills')
          .update({ pdf_url: pdfUrl })
          .eq('id', billId);

        if (updateError) {
          console.error('Error updating bill record:', updateError);
          results.push({ billId, success: false, error: updateError.message });
          continue;
        }

        results.push({ billId, success: true, pdfUrl });
      } catch (error) {
        console.error('Error processing bill:', billId, error);
        results.push({
          billId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error in auto PDF generation:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate PDFs',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 