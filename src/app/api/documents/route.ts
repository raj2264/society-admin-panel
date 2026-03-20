import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Process form data with file upload
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const residentId = formData.get('residentId') as string;
    const societyId = formData.get('societyId') as string;
    const documentType = formData.get('documentType') as string;
    const description = formData.get('description') as string;

    if (!residentId || !societyId || !files.length) {
      return NextResponse.json(
        { error: 'Required fields missing' },
        { status: 400 }
      );
    }

    const uploadResults = [];
    const errors = [];

    // Upload each file and create document record
    for (const file of files) {
      try {
        // 1. Upload file to storage
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `documents/${societyId}/${residentId}/${fileName}`;
        
        const fileBuffer = await file.arrayBuffer();
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from('societydocuments')
          .upload(filePath, fileBuffer, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          errors.push(`Error uploading ${file.name}: ${uploadError.message}`);
          continue;
        }

        // 2. Build proxy URL instead of exposing Supabase URL
        const proxyUrl = `/api/storage/societydocuments/${filePath}`;

        // 3. Create document record in database
        const { data: documentData, error: documentError } = await supabaseAdmin
          .from('residentdocuments')
          .insert({
            resident_id: residentId,
            society_id: societyId,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            file_path: filePath,
            public_url: proxyUrl,
            document_type: documentType || 'general',
            description: description || ''
          })
          .select()
          .single();

        if (documentError) {
          errors.push(`Error creating document record for ${file.name}: ${documentError.message}`);
          
          // Try to clean up the uploaded file
          try {
            await supabaseAdmin
              .storage
              .from('societydocuments')
              .remove([filePath]);
          } catch (deleteError) {
            console.error('Failed to delete file after error:', deleteError);
          }
          
          continue;
        }

        uploadResults.push(documentData);
      } catch (fileError) {
        errors.push(`Error processing ${file.name}: ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
      }
    }

    // Return combined results
    return NextResponse.json({ 
      data: uploadResults,
      errors: errors.length > 0 ? errors : null,
      success: uploadResults.length > 0
    });
  } catch (error) {
    console.error('Unexpected error in document upload:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const residentId = searchParams.get('residentId');
    const societyId = searchParams.get('societyId');

    if (!societyId) {
      return NextResponse.json(
        { error: 'Society ID is required' },
        { status: 400 }
      );
    }

    let query = supabaseAdmin
      .from('residentdocuments')
      .select('*')
      .eq('society_id', societyId)
      .order('created_at', { ascending: false });

    // Filter by resident if provided
    if (residentId) {
      query = query.eq('resident_id', residentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in document fetch:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // 1. Get document data
    const { data: documentData, error: fetchError } = await supabaseAdmin
      .from('residentdocuments')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError) {
      console.error('Error fetching document:', fetchError);
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      );
    }

    // 2. Delete file from storage
    const { error: deleteFileError } = await supabaseAdmin
      .storage
      .from('societydocuments')
      .remove([documentData.file_path]);

    if (deleteFileError) {
      console.error('Error deleting file from storage:', deleteFileError);
      // Continue to delete database record even if file deletion fails
    }

    // 3. Delete database record
    const { error: deleteRecordError } = await supabaseAdmin
      .from('residentdocuments')
      .delete()
      .eq('id', documentId);

    if (deleteRecordError) {
      console.error('Error deleting document record:', deleteRecordError);
      return NextResponse.json(
        { error: deleteRecordError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in document deletion:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 