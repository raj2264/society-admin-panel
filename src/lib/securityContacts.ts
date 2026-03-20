import { supabase } from './supabase';
import { SecurityContact } from './types';

// Get all security contacts for a society
export async function getSecurityContacts(societyId: string) {
  const { data, error } = await supabase
    .from('security_contacts')
    .select('*')
    .eq('society_id', societyId)
    .order('contact_type');

  if (error) throw error;
  return data as SecurityContact[];
}

// Create a new security contact
export async function createSecurityContact(contact: Omit<SecurityContact, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('security_contacts')
    .insert(contact)
    .select()
    .single();

  if (error) throw error;
  return data as SecurityContact;
}

// Update an existing security contact
export async function updateSecurityContact(id: string, contact: Partial<Omit<SecurityContact, 'id' | 'created_at' | 'updated_at'>>) {
  const { data, error } = await supabase
    .from('security_contacts')
    .update(contact)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as SecurityContact;
}

// Delete a security contact
export async function deleteSecurityContact(id: string) {
  const { error } = await supabase
    .from('security_contacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
} 