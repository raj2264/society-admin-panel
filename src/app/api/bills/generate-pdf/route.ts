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
    console.log('PDF generation request received');
    const { billId } = await request.json();
    console.log('Bill ID:', billId);

    if (!billId) {
      console.error('No bill ID provided');
      return NextResponse.json(
        { error: 'Bill ID is required' },
        { status: 400 }
      );
    }

    // Fetch bill data with all required information
    console.log('Fetching bill data...');
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
      return NextResponse.json(
        { error: 'Failed to fetch bill data: ' + billError.message },
        { status: 404 }
      );
    }

    if (!bill) {
      console.error('No bill found with ID:', billId);
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    console.log('Bill data fetched successfully:', {
      billNumber: bill.bill_number,
      resident: bill.residents?.name,
      template: bill.bill_templates?.name,
      components: Object.keys(bill.bill_components || {}).length
    });

    if (!bill.residents) {
      console.error('No resident data found for bill');
      return NextResponse.json(
        { error: 'Resident data not found' },
        { status: 400 }
      );
    }

    if (!bill.bill_templates) {
      console.error('No template data found for bill');
      return NextResponse.json(
        { error: 'Template data not found' },
        { status: 400 }
      );
    }

    if (!bill.societies) {
      console.error('No society data found for bill');
      return NextResponse.json(
        { error: 'Society data not found' },
        { status: 400 }
      );
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
    console.log('PDF generated, buffer size:', pdfBuffer.length);

    // Upload PDF to storage
    console.log('Uploading PDF to storage...');
    const pdfUrl = await uploadPDFToStorage(pdfBuffer, billId);
    console.log('PDF uploaded, URL:', pdfUrl);

    // Update bill record with PDF URL
    console.log('Updating bill record...');
    const { error: updateError } = await supabase
      .from('maintenance_bills')
      .update({ pdf_url: pdfUrl })
      .eq('id', billId);

    if (updateError) {
      console.error('Error updating bill record:', updateError);
      return NextResponse.json(
        { error: 'Failed to update bill record: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('Bill record updated successfully');
    return NextResponse.json({ success: true, pdfUrl });
  } catch (error) {
    console.error('Error in PDF generation:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate PDF',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 