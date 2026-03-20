import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

// GET a specific guard
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Guard ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('guards')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching guard:', error);
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in guard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE a guard
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Guard ID is required' },
        { status: 400 }
      );
    }

    // First get the guard to get the user_id and verify it exists
    const { data: guardData, error: guardError } = await supabase
      .from('guards')
      .select('user_id, society_id')
      .eq('id', id)
      .single();

    if (guardError) {
      console.error('Error fetching guard:', guardError);
      return NextResponse.json({ error: 'Guard not found' }, { status: 404 });
    }

    // Start a transaction to ensure both operations succeed or fail together
    const { error: transactionError } = await supabase.rpc('delete_guard', {
      guard_id: id,
      guard_user_id: guardData.user_id
    });

    if (transactionError) {
      console.error('Error in delete_guard transaction:', transactionError);
      return NextResponse.json({ 
        error: 'Failed to delete guard. Please try again.' 
      }, { status: 500 });
    }

    return NextResponse.json(
      { message: 'Guard successfully deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in guard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH to update a guard
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, phone, status } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Guard ID is required' },
        { status: 400 }
      );
    }

    // Update the guard record
    const { data, error } = await supabase
      .from('guards')
      .update({
        name: name,
        phone: phone,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guard:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      data,
      message: 'Guard successfully updated' 
    });
  } catch (error) {
    console.error('Error in guard API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 