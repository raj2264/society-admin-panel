import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { vendorId, societyId } = await request.json();
    
    if (!vendorId || !societyId) {
      return NextResponse.json(
        { error: 'Vendor ID and Society ID are required' },
        { status: 400 }
      );
    }
    
    // First verify the society exists
    const { data: society, error: societyError } = await supabase
      .from('societies')
      .select('id')
      .eq('id', societyId)
      .single();
    
    if (societyError || !society) {
      return NextResponse.json(
        { error: 'Society not found' },
        { status: 404 }
      );
    }
    
    // Update the vendor's society_id
    const { data, error } = await supabase
      .from('vendors')
      .update({ society_id: societyId })
      .eq('id', vendorId)
      .select();
    
    if (error) {
      console.error('Error updating vendor:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Vendor society updated successfully',
      data 
    });
  } catch (error) {
    console.error('Error updating vendor society:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 