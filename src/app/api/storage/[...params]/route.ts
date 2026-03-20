import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_BUCKETS = [
  'maintenance-bills',
  'complaint-attachments',
  'poll-attachments',
  'essential-documents',
  'societydocuments',
];

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ params: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const segments = resolvedParams.params;

    if (!segments || segments.length < 2) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const bucket = segments[0];
    const filePath = segments.slice(1).join('/');

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Prevent path traversal
    if (filePath.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(filePath);

    if (error || !data) {
      console.error('Storage proxy error:', error);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const arrayBuffer = await data.arrayBuffer();
    const contentType = data.type || getMimeType(filePath);

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        'Content-Disposition': 'inline',
      },
    });
  } catch (error) {
    console.error('Storage proxy unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
