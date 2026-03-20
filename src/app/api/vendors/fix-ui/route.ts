import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { vendor_id } = await request.json();
    
    if (!vendor_id) {
      return NextResponse.json(
        { error: 'Vendor ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch the vendor
    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', vendor_id)
      .single();
    
    if (vendorError || !vendor) {
      return NextResponse.json(
        { error: vendorError?.message || 'Vendor not found' },
        { status: 404 }
      );
    }
    
    // Check and fix common issues
    const updates = {
      // Ensure is_available is set to true
      is_available: true,
      
      // Make sure name is valid and not too long (VendorCard has limited space)
      name: vendor.name?.trim() || 'Service Provider',
      
      // Ensure category is from the supported list
      category: validateCategory(vendor.category),
      
      // Make sure phone is valid
      phone: vendor.phone?.trim() || '1234567890',
      
      // Add a description if missing
      description: vendor.description?.trim() || 'Service provider for your society',
      
      // Add service hours if missing
      service_hours: vendor.service_hours?.trim() || 'Mon-Fri: 9AM-5PM',
    };
    
    // Update the vendor
    const { data: updatedVendor, error: updateError } = await supabase
      .from('vendors')
      .update(updates)
      .eq('id', vendor_id)
      .select();
    
    if (updateError) {
      console.error('Error updating vendor:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    
    // Find all residents in the same society
    const { data: society, error: societyError } = await supabase
      .from('vendors')
      .select('society_id')
      .eq('id', vendor_id)
      .single();
    
    let residents: any[] = [];
    if (society && society.society_id) {
      const { data: societyResidents } = await supabase
        .from('residents')
        .select('id, name, society_id')
        .eq('society_id', society.society_id)
        .limit(5);
      
      residents = societyResidents || [];
    }
    
    return NextResponse.json({
      success: true,
      message: 'Vendor updated to fix UI issues',
      before: vendor,
      after: updatedVendor?.[0] || null,
      residents_in_same_society: residents
    });
  } catch (error) {
    console.error('Error fixing vendor UI:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to validate category
function validateCategory(category: string | null): string {
  const validCategories = [
    'Plumber',
    'Electrician',
    'Carpenter',
    'Painter',
    'Cleaning',
    'Security',
    'Gardening',
    'Pest Control',
    'Laundry',
    'Food Delivery',
    'Grocery Delivery',
    'Maintenance',
    'Other'
  ];
  
  if (!category || !validCategories.includes(category)) {
    return 'Other';
  }
  
  return category;
} 