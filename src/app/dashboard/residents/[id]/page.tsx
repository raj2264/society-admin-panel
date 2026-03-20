'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Clock, User, Building, Car, Bike } from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { useToast } from '@/components/ui/use-toast';
import DocumentList from "../../../../components/DocumentList";
import DocumentUploader from "../../../../components/DocumentUploader";

interface Vehicle {
  id: string;
  vehicle_type: string;
  make: string;
  model: string;
  color: string | null;
  license_plate: string;
  parking_spot: string | null;
  is_primary: boolean;
  created_at: string;
}

export default function ResidentDetailView({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState<any>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showDocumentUploader, setShowDocumentUploader] = useState(false);
  const [societyId, setSocietyId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const resolvedParams = React.use(params);
  const residentId = resolvedParams.id;

  useEffect(() => {
    async function loadResidentData() {
      try {
        setLoading(true);
        console.log('Loading resident data for ID:', residentId);
        
        if (!residentId) {
          console.error('No resident ID provided');
          toast({
            title: 'Error',
            description: 'No resident ID provided',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }
        
        // Get society ID first
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        const { data: adminData, error: adminError } = await supabase
          .from("society_admins")
          .select("society_id")
          .eq("user_id", session.user.id)
          .single();

        if (adminError) {
          throw adminError;
        }

        setSocietyId(adminData.society_id);
        
        // Fetch resident data
        console.log('Fetching resident data...');
        const { data: residentData, error: residentError } = await supabase
          .from('residents')
          .select('*')
          .eq('id', residentId)
          .single();
          
        if (residentError) {
          console.error('Resident fetch error:', residentError);
          throw residentError;
        }
        
        console.log('Resident data received:', residentData);
        setResident(residentData);
        
        // Fetch vehicles
        console.log('Fetching vehicles...');
        const { data: vehiclesData, error: vehiclesError } = await supabase
          .from('vehicles')
          .select('*')
          .eq('resident_id', residentId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: false });
          
        if (vehiclesError) {
          console.error('Vehicles fetch error:', vehiclesError);
          throw vehiclesError;
        }
        
        console.log('Vehicles data received:', vehiclesData?.length || 0, 'vehicles');
        setVehicles(vehiclesData || []);
        
      } catch (error) {
        console.error('Error loading resident data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load resident information',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    if (residentId) {
      loadResidentData();
    }
  }, [residentId, supabase, toast]);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading resident information...</p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-4">
        <p className="text-muted-foreground">Resident not found</p>
        <Button asChild>
          <Link href="/dashboard/residents">
            Back to Residents
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/dashboard/residents">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{resident.name}</h1>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          {resident.status || 'Active'}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resident Information</CardTitle>
            <CardDescription>Personal and contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <Building className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="font-medium">Unit {resident.unit_number}</p>
                <p className="text-sm text-muted-foreground">Residence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <p>{resident.phone || 'No phone number'}</p>
            </div>
            
            {resident.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p>{resident.email}</p>
              </div>
            )}
            
            {resident.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <p>{resident.address}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicles</CardTitle>
            <CardDescription>
              {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vehicles.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No vehicles registered
              </div>
            ) : (
              <>
                {vehicles.slice(0, 2).map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="p-4 border rounded-lg space-y-2 bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-full bg-primary/10">
                          {vehicle.vehicle_type === 'car' ? (
                            <Car className="h-4 w-4 text-primary" />
                          ) : vehicle.vehicle_type === 'bike' ? (
                            <Bike className="h-4 w-4 text-primary" />
                          ) : (
                            <Car className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.vehicle_type.charAt(0).toUpperCase() + vehicle.vehicle_type.slice(1)}
                          </p>
                        </div>
                      </div>
                      {vehicle.is_primary && (
                        <Badge variant="secondary">Primary</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">License Plate</p>
                        <p>{vehicle.license_plate}</p>
                      </div>
                      {vehicle.color && (
                        <div>
                          <p className="text-muted-foreground">Color</p>
                          <p>{vehicle.color}</p>
                        </div>
                      )}
                      {vehicle.parking_spot && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Parking Spot</p>
                          <p>{vehicle.parking_spot}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {vehicles.length > 2 && (
                  <div className="text-center text-sm text-muted-foreground">
                    +{vehicles.length - 2} more vehicle{vehicles.length - 2 !== 1 ? 's' : ''}
                  </div>
                )}
              </>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push(`/dashboard/residents/${resolvedParams.id}/vehicles`)}
            >
              <Car className="mr-2 h-4 w-4" />
              View All Vehicles
            </Button>
          </CardFooter>
        </Card>

        {/* Documents Section */}
        {societyId && (
          <Card>
            {showDocumentUploader ? (
              <DocumentUploader
                residentId={residentId}
                societyId={societyId}
                onUploadComplete={() => {
                  setShowDocumentUploader(false);
                  // The DocumentList component will refresh itself
                }}
                onError={(error) => {
                  toast({
                    title: "Error",
                    description: error,
                    variant: "destructive",
                  });
                }}
              />
            ) : (
              <DocumentList
                residentId={residentId}
                societyId={societyId}
                showAddButton={true}
                onAddClick={() => setShowDocumentUploader(true)}
                onDocumentDeleted={() => {
                  toast({
                    title: "Success",
                    description: "Document deleted successfully",
                  });
                }}
              />
            )}
          </Card>
        )}
      </div>
    </div>
  );
} 