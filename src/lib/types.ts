export interface VendorData {
  id: string;
  society_id: string;
  name: string;
  category: string;
  contact_person?: string;
  phone: string;
  email?: string;
  description?: string;
  address?: string;
  service_hours?: string;
  rating?: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorBookingData {
  id: string;
  vendor_id: string;
  resident_id: string;
  service_description: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  resident?: {
    id: string;
    name: string;
    flat_number: string;
    phone: string;
  };
  vendor?: {
    id: string;
    name: string;
    category: string;
  };
}

export type SecurityContact = {
  id: string;
  society_id: string;
  name: string;
  contact_type: string;
  phone: string;
  email?: string;
  role?: string;
  address?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}; 