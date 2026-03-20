import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get vendor data from request
    const vendorData = await request.json();
    
    // Extract society_id from request or use default
    let { society_id, ...rest } = vendorData;
    
    // If no society_id provided, try to get one from the database
    if (!society_id) {
      // First check if any societies exist
      const { data: existingSocieties, error: fetchError } = await supabase
        .from('societies')
        .select('id')
        .limit(1);
      
      if (fetchError) {
        console.error('Error fetching societies:', fetchError);
      }
      
      // If no societies exist, create a test society
      if (!existingSocieties || existingSocieties.length === 0) {
        console.log('No societies found, creating a test society');
        
        const { data: newSociety, error: createError } = await supabase
          .from('societies')
          .insert({
            name: 'Test Society',
            address: '123 Test Street',
            city: 'Test City',
            pincode: '123456',
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (createError) {
          console.error('Error creating test society:', createError);
          return NextResponse.json(
            { error: 'Could not create a test society: ' + createError.message },
            { status: 500 }
          );
        }
        
        society_id = newSociety.id;
      } else {
        // Use the first society found
        society_id = existingSocieties[0].id;
      }
    }
    
    // Now insert the vendor with the valid society_id
    const { data, error } = await supabase
      .from('vendors')
      .insert({ ...rest, society_id })
      .select();
    
    if (error) {
      console.error('Error creating vendor:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in vendors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Fetch all vendors using the service role client (bypasses RLS)
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching vendors:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in vendors API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 