import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';
import { format } from 'date-fns';

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface BillData {
  id: string;
  bill_number: string;
  bill_date: string;
  due_date: string;
  total_amount: number;
  society_name: string;
  bill_components: {
    [key: string]: {
      name: string;
      amount: number;
    };
  };
  resident: {
    name: string;
    unit_number: string;
    email: string;
  };
  template: {
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
  };
}

async function imageUrlToDataUrl(
  imageUrl: string
): Promise<{ dataUrl: string; format: 'PNG' | 'JPEG' }> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch QR image: ${response.status}`);
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const format: 'PNG' | 'JPEG' = contentType.includes('png') ? 'PNG' : 'JPEG';
  const mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';

  const bytes = await response.arrayBuffer();
  const base64 = Buffer.from(bytes).toString('base64');
  return {
    dataUrl: `data:${mimeType};base64,${base64}`,
    format,
  };
}

// ── Color Palette ───────────────────────────────────────────────────────────
const COLORS = {
  primary:     [30, 58, 95] as const,    // Deep navy
  accent:      [0, 119, 182] as const,   // Professional blue
  accentLight: [144, 205, 244] as const, // Soft sky blue
  success:     [39, 174, 96] as const,   // Green for amounts
  dark:        [33, 37, 41] as const,    // Near-black text
  body:        [73, 80, 87] as const,    // Body text gray
  muted:       [134, 142, 150] as const, // Muted text
  light:       [248, 249, 250] as const, // Very light bg
  tableBg:     [241, 245, 249] as const, // Table alternate row
  border:      [206, 212, 218] as const, // Borders
  white:       [255, 255, 255] as const,
};

// ── Helper to draw text with specific color/size ────────────────────────────
function setFont(
  doc: jsPDF,
  size: number,
  color: readonly [number, number, number],
  style: 'normal' | 'bold' | 'italic' = 'normal'
) {
  doc.setFontSize(size);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFont('helvetica', style);
}

function drawLine(
  doc: jsPDF,
  x1: number, y1: number, x2: number, y2: number,
  color: readonly [number, number, number] = COLORS.border,
  width = 0.3
) {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function generateBillPDF(billData: BillData): Promise<Buffer> {
  try {
    console.log('Starting PDF generation for bill:', billData.bill_number);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();   // 210
    const pageHeight = doc.internal.pageSize.getHeight();  // 297
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const rightX = pageWidth - margin;
    let y = 0;

    // ── 1. TOP ACCENT BAR ─────────────────────────────────────────────────
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // ── 2. HEADER AREA ────────────────────────────────────────────────────
    y = 18;

    // Society name (large, navy, bold)
    setFont(doc, 22, COLORS.primary, 'bold');
    doc.text(billData.society_name.toUpperCase(), margin, y);
    y += 7;

    // Subtitle / header text
    if (billData.template.header_text) {
      setFont(doc, 9, COLORS.muted, 'normal');
      doc.text(billData.template.header_text, margin, y);
      y += 5;
    }

    // "MAINTENANCE BILL" badge — right-aligned
    const badgeText = 'MAINTENANCE BILL';
    setFont(doc, 13, COLORS.white, 'bold');
    const badgeW = doc.getTextWidth(badgeText) + 16;
    const badgeH = 10;
    const badgeX = rightX - badgeW;
    const badgeY = 12;
    doc.setFillColor(...COLORS.accent);
    // Rounded rectangle
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, 'F');
    doc.text(badgeText, badgeX + 8, badgeY + 7.2);

    // Thin divider line under header
    y = Math.max(y, badgeY + badgeH + 4) + 2;
    drawLine(doc, margin, y, rightX, y, COLORS.accent, 0.6);
    y += 10;

    // ── 3. BILL META & RESIDENT — TWO-COLUMN LAYOUT ───────────────────────
    const colLeftX = margin;
    const colRightX = pageWidth / 2 + 10;

    // LEFT: Bill To
    setFont(doc, 8, COLORS.accent, 'bold');
    doc.text('BILL TO', colLeftX, y);
    y += 5;

    setFont(doc, 11, COLORS.dark, 'bold');
    doc.text(billData.resident.name, colLeftX, y);
    y += 5.5;

    setFont(doc, 9.5, COLORS.body, 'normal');
    doc.text(`Unit: ${billData.resident.unit_number}`, colLeftX, y);
    y += 5;
    if (billData.resident.email) {
      doc.text(billData.resident.email, colLeftX, y);
      y += 5;
    }

    // RIGHT: Bill details (positioned at same baseline as "BILL TO")
    let ry = y - (billData.resident.email ? 20.5 : 15.5);

    setFont(doc, 8, COLORS.accent, 'bold');
    doc.text('BILL DETAILS', colRightX, ry);
    ry += 5;

    const metaRows = [
      ['Bill No.', billData.bill_number],
      ['Bill Date', format(new Date(billData.bill_date), 'dd MMM yyyy')],
      ['Due Date', format(new Date(billData.due_date), 'dd MMM yyyy')],
      ['Status', 'Pending'],
    ];

    metaRows.forEach(([label, value]) => {
      setFont(doc, 9, COLORS.muted, 'normal');
      doc.text(`${label}:`, colRightX, ry);
      setFont(doc, 9.5, COLORS.dark, 'bold');
      doc.text(value, colRightX + 30, ry);
      ry += 5.5;
    });

    y = Math.max(y, ry) + 6;

    // ── 4. COMPONENTS TABLE ────────────────────────────────────────────────
    // Table header
    const tableX = margin;
    const tableW = contentWidth;
    const colSno = tableX;
    const colDesc = tableX + 14;
    const colAmt = rightX;
    const rowH = 9;
    const headerH = 10;

    // Header row background
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(tableX, y, tableW, headerH, 1.5, 1.5, 'F');
    // Clip the bottom corners to be square so it connects to table body
    doc.setFillColor(...COLORS.primary);
    doc.rect(tableX, y + headerH / 2, tableW, headerH / 2, 'F');

    setFont(doc, 8.5, COLORS.white, 'bold');
    doc.text('#', colSno + 5, y + 7);
    doc.text('DESCRIPTION', colDesc, y + 7);
    doc.text('AMOUNT (INR)', colAmt - 2, y + 7, { align: 'right' });
    y += headerH;

    // Table rows
    let totalAmount = 0;
    const components = Object.entries(billData.bill_components);

    components.forEach(([, component], index) => {
      const isAlt = index % 2 !== 0;

      if (isAlt) {
        doc.setFillColor(...COLORS.tableBg);
        doc.rect(tableX, y, tableW, rowH, 'F');
      }

      // Row border bottom
      drawLine(doc, tableX, y + rowH, tableX + tableW, y + rowH, COLORS.border, 0.15);

      setFont(doc, 9, COLORS.muted, 'normal');
      doc.text(String(index + 1), colSno + 5, y + 6.2);

      setFont(doc, 9.5, COLORS.dark, 'normal');
      doc.text(component.name, colDesc, y + 6.2);

      setFont(doc, 9.5, COLORS.dark, 'bold');
      doc.text(formatCurrency(component.amount), colAmt - 2, y + 6.2, { align: 'right' });

      totalAmount += component.amount;
      y += rowH;
    });

    // Outer border of the table body
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.rect(tableX, y - rowH * components.length, tableW, rowH * components.length);

    // ── Subtotal / Total section ──
    y += 2;

    // Subtotal line
    const totalBoxX = rightX - 70;
    setFont(doc, 9, COLORS.body, 'normal');
    doc.text('Subtotal:', totalBoxX, y + 5);
    setFont(doc, 9.5, COLORS.dark, 'normal');
    doc.text(formatCurrency(totalAmount), colAmt - 2, y + 5, { align: 'right' });
    y += 8;

    // Divider
    drawLine(doc, totalBoxX, y, colAmt, y, COLORS.border, 0.3);
    y += 3;

    // Grand total — bold, accent box
    doc.setFillColor(...COLORS.primary);
    doc.roundedRect(totalBoxX - 4, y - 1, rightX - totalBoxX + 6, 12, 1.5, 1.5, 'F');
    setFont(doc, 10, COLORS.white, 'bold');
    doc.text('TOTAL DUE', totalBoxX, y + 7.5);
    setFont(doc, 11, COLORS.white, 'bold');
    doc.text(`Rs. ${formatCurrency(totalAmount)}`, colAmt - 2, y + 7.5, { align: 'right' });

    y += 20;

    // ── 5. BANK DETAILS SECTION ────────────────────────────────────────────
    if (billData.template.bank_details) {
      const bank = billData.template.bank_details;

      // Section heading with left accent
      doc.setFillColor(...COLORS.accent);
      doc.rect(margin, y, 3, 6, 'F');
      setFont(doc, 10, COLORS.primary, 'bold');
      doc.text('PAYMENT DETAILS', margin + 7, y + 5);
      y += 12;

      const hasPaymentQr = !!bank.payment_qr_url;

      // Light card background
      const cardH = hasPaymentQr ? 60 : 36;
      doc.setFillColor(...COLORS.light);
      doc.setDrawColor(...COLORS.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(margin, y, contentWidth, cardH, 2, 2, 'FD');

      const bankColLeft = margin + 8;
      const bankColRight = hasPaymentQr ? pageWidth / 2 : pageWidth / 2 + 5;
      let by = y + 8;

      const bankFields = [
        { label: 'Bank Name', value: bank.bank_name, x: bankColLeft },
        { label: 'Account Name', value: bank.account_name, x: bankColRight },
        { label: 'Account No.', value: bank.account_number, x: bankColLeft },
        { label: 'IFSC Code', value: bank.ifsc_code, x: bankColRight },
      ];

      for (let i = 0; i < bankFields.length; i += 2) {
        for (let j = 0; j < 2; j++) {
          const field = bankFields[i + j];
          if (!field) continue;
          setFont(doc, 7.5, COLORS.muted, 'normal');
          doc.text(field.label, field.x, by);
          setFont(doc, 9.5, COLORS.dark, 'bold');
          doc.text(field.value || '—', field.x, by + 5);
        }
        by += 14;
      }

      if (hasPaymentQr && bank.payment_qr_url) {
        try {
          const qrSize = 26;
          const qrX = rightX - qrSize - 8;
          const qrY = y + 10;

          const { dataUrl, format } = await imageUrlToDataUrl(bank.payment_qr_url);
          doc.addImage(dataUrl, format, qrX, qrY, qrSize, qrSize);

          setFont(doc, 7.5, COLORS.muted, 'normal');
          doc.text('Scan to Pay', qrX + qrSize / 2, qrY + qrSize + 4, {
            align: 'center',
          });
        } catch (qrError) {
          console.error('Failed to embed payment QR in PDF:', qrError);
        }
      }

      y += cardH + 8;
    }

    // ── 6. TERMS & CONDITIONS ──────────────────────────────────────────────
    if (billData.template.terms_and_conditions?.length) {
      // Check if we need a new page
      const termsHeight = 10 + billData.template.terms_and_conditions.length * 5.5;
      if (y + termsHeight > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(...COLORS.accent);
      doc.rect(margin, y, 3, 6, 'F');
      setFont(doc, 10, COLORS.primary, 'bold');
      doc.text('TERMS & CONDITIONS', margin + 7, y + 5);
      y += 12;

      billData.template.terms_and_conditions.forEach((term, index) => {
        setFont(doc, 8.5, COLORS.body, 'normal');
        // Wrap long text
        const lines = doc.splitTextToSize(`${index + 1}. ${term}`, contentWidth - 8);
        doc.text(lines, margin + 4, y);
        y += lines.length * 4.5;
      });

      y += 4;
    }

    // ── 7. FOOTER TEXT ─────────────────────────────────────────────────────
    if (billData.template.footer_text) {
      if (y + 15 > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      setFont(doc, 8.5, COLORS.body, 'italic');
      const footerLines = doc.splitTextToSize(billData.template.footer_text, contentWidth);
      doc.text(footerLines, margin, y);
      y += footerLines.length * 4.5 + 4;
    }

    // ── 8. PAGE FOOTER ─────────────────────────────────────────────────────
    // Bottom accent bar
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');

    // Footer text on the bar
    setFont(doc, 7, COLORS.white, 'normal');
    doc.text(
      'This is a computer-generated document and does not require a signature.',
      pageWidth / 2,
      pageHeight - 5.5,
      { align: 'center' }
    );

    // Bill number in bottom-left
    setFont(doc, 7, [200, 210, 220], 'normal');
    doc.text(billData.bill_number, margin, pageHeight - 5.5);

    // Thin accent line just above footer bar
    drawLine(doc, margin, pageHeight - 14, rightX, pageHeight - 14, COLORS.accentLight, 0.4);

    // ── DONE ──────────────────────────────────────────────────────────────
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    console.log('PDF generation completed');
    return pdfBuffer;
  } catch (error) {
    console.error('Error in PDF generation:', error);
    throw error;
  }
}

export async function uploadPDFToStorage(pdfBuffer: Buffer, billId: string): Promise<string> {
  try {
    console.log('Starting PDF upload, buffer size:', pdfBuffer.length);
    const fileName = `bills/${billId}.pdf`;
    
    // First, create the bucket if it doesn't exist
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();

    if (bucketsError) {
      throw bucketsError;
    }

    const bucketExists = buckets.some(b => b.name === 'maintenance-bills');
    if (!bucketExists) {
      console.log('Creating maintenance-bills bucket...');
      const { error: createError } = await supabase
        .storage
        .createBucket('maintenance-bills', { public: true });
      
      if (createError) {
        throw createError;
      }
    }

    // Upload the file
    console.log('Uploading file:', fileName);
    const { data, error } = await supabase.storage
      .from('maintenance-bills')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (error) {
      console.error('Error uploading PDF:', error);
      throw error;
    }

    console.log('PDF uploaded successfully:', data);

    // Return full public Supabase URL so mobile app can download directly
    const { data: publicUrlData } = supabase.storage
      .from('maintenance-bills')
      .getPublicUrl(fileName);
    console.log('Generated public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadPDFToStorage:', error);
    throw error;
  }
} 