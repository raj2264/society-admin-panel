import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const societyId = formData.get('societyId') as string | null;

    if (!file || !societyId) {
      return NextResponse.json({ error: 'file and societyId are required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed for payment QR' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const safeBase = file.name
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 60);
    const fileName = `${Date.now()}_${safeBase}.${fileExt}`;
    const filePath = `payment-qr/${societyId}/${fileName}`;

    // Ensure the bucket exists. This is idempotent.
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    if (bucketsError) {
      return NextResponse.json({ error: bucketsError.message }, { status: 500 });
    }

    const bucketExists = (buckets || []).some((bucket) => bucket.name === 'maintenance-bills');
    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket('maintenance-bills', {
        public: true,
      });
      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
      }
    }

    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabaseAdmin.storage
      .from('maintenance-bills')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicData } = supabaseAdmin.storage
      .from('maintenance-bills')
      .getPublicUrl(filePath);

    return NextResponse.json({
      payment_qr_url: publicData.publicUrl,
      payment_qr_file_name: file.name,
      payment_qr_path: filePath,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload payment QR' },
      { status: 500 }
    );
  }
}
