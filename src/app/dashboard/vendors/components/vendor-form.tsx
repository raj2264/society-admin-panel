'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from '@/components/ui/card';
import { getVendorCategories } from '@/lib/vendors';

// Define form schema with zod
const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  category: z.string().min(1, { message: 'Category is required' }),
  contact_person: z.string().optional(),
  phone: z.string().min(5, { message: 'Valid phone number is required' }),
  email: z.string().email().optional().or(z.literal('')),
  description: z.string().optional(),
  address: z.string().optional(),
  service_hours: z.string().optional(),
  is_available: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface VendorFormProps {
  vendorId?: string;
}

export default function VendorForm({ vendorId }: VendorFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<FormValues | null>(null);
  const categories = getVendorCategories();

  // Initialize form with react-hook-form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      contact_person: '',
      phone: '',
      email: '',
      description: '',
      address: '',
      service_hours: '',
      is_available: true,
    },
  });

  // Fetch vendor data if editing
  useEffect(() => {
    async function fetchVendorData() {
      if (!vendorId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', vendorId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setInitialData(data);
          form.reset({
            name: data.name || '',
            category: data.category || '',
            contact_person: data.contact_person || '',
            phone: data.phone || '',
            email: data.email || '',
            description: data.description || '',
            address: data.address || '',
            service_hours: data.service_hours || '',
            is_available: data.is_available,
          });
        }
      } catch (error) {
        console.error('Error fetching vendor:', error);
        toast({
          title: 'Error',
          description: 'Failed to load vendor data',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    
    fetchVendorData();
  }, [vendorId, form, toast]);

  // Handle form submission
  async function onSubmit(values: FormValues) {
    setLoading(true);
    
    try {
      let response;
      
      if (vendorId) {
        // Update existing vendor
        response = await supabase
          .from('vendors')
          .update(values)
          .eq('id', vendorId);
          
        if (response.error) throw response.error;
      } else {
        // Insert new vendor via server-side API
        const { data: societyData } = await supabase.auth.getSession();
        const societyId = societyData?.session?.user?.app_metadata?.society_id;
        
        // Call our server API endpoint that uses service role to bypass RLS
        const apiResponse = await fetch('/api/vendors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...values,
            society_id: societyId // The API will handle this being null
          }),
        });
        
        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          throw new Error(errorData.error || 'Failed to create vendor');
        }
        
        response = { error: null };
      }
      
      toast({
        title: 'Success',
        description: vendorId ? 'Vendor updated successfully' : 'Vendor added successfully',
      });
      
      router.push('/dashboard/vendors');
      router.refresh();
    } catch (error: any) {
      console.error('Error saving vendor:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save vendor',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter vendor name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category*</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter contact person name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="service_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Hours</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mon-Fri: 9AM-5PM" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter vendor description and services offered"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="is_available"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Availability Status</FormLabel>
                    <FormDescription>
                      Mark this vendor as available for services
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard/vendors')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : vendorId ? 'Update Vendor' : 'Add Vendor'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
} 