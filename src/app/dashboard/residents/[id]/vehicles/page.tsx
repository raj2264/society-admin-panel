'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Car, Bike, Plus, Edit2, Trash2, Star, StarOff } from 'lucide-react';
import { toast } from 'sonner';
import { use } from 'react';

interface Vehicle {
  id: string;
  resident_id: string;
  vehicle_type: string;
  make: string;
  model: string;
  color: string | null;
  license_plate: string;
  parking_spot: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

interface Society {
  id: string;
  name: string;
}

interface Resident {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit_number: string;
  created_at: string;
  societies: Society | null;
}

export default function ResidentVehiclesPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [loading, setLoading] = useState(true);
  const [resident, setResident] = useState<Resident | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isResidentSelf, setIsResidentSelf] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    vehicle_type: 'car',
    make: '',
    model: '',
    color: '',
    license_plate: '',
    parking_spot: '',
  });
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const checkAuthorization = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth/login');
        return;
      }

      // Check if user is a resident and matches the resident_id
      const { data: residentData, error: residentError } = await supabase
        .from('residents')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('id', resolvedParams.id)
        .single();

      if (residentError || !residentData) {
        // Check if user is a society admin
        const { data: isAdmin, error: adminError } = await supabase
          .rpc('is_society_admin', { user_id: session.user.id });

        if (adminError || !isAdmin) {
          toast.error('Access Denied', {
            description: 'You do not have permission to manage vehicles for this resident.'
          });
          router.push('/dashboard/residents');
          return;
        }
        setIsResidentSelf(false);
      } else {
        setIsResidentSelf(true);
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error('Error checking authorization:', error);
      toast.error('Error checking permissions');
      router.push('/dashboard/residents');
    }
  };

  useEffect(() => {
    checkAuthorization();
  }, [resolvedParams.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch resident data
      const { data: residentData, error: residentError } = await supabase
        .from("residents")
        .select(`
          id,
          name,
          email,
          phone,
          unit_number,
          created_at,
          societies (
            id,
            name
          )
        `)
        .eq("id", resolvedParams.id)
        .single();

      if (residentError) {
        console.error("Error fetching resident data:", {
          code: residentError.code,
          message: residentError.message,
          details: residentError.details,
          hint: residentError.hint
        });
        throw residentError;
      }

      if (!residentData) {
        throw new Error("Resident not found");
      }

      const society = Array.isArray(residentData.societies) 
        ? { 
            id: residentData.societies[0].id,
            name: residentData.societies[0].name
          }
        : residentData.societies 
          ? {
              id: (residentData.societies as any).id,
              name: (residentData.societies as any).name
            }
          : null;

      setResident({
        id: residentData.id,
        name: residentData.name,
        email: residentData.email,
        phone: residentData.phone,
        unit_number: residentData.unit_number,
        created_at: residentData.created_at,
        societies: society
      });

      // Fetch vehicles
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("*")
        .eq("resident_id", resolvedParams.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });

      if (vehiclesError) {
        console.error("Error fetching vehicles:", {
          code: vehiclesError.code,
          message: vehiclesError.message,
          details: vehiclesError.details,
          hint: vehiclesError.hint
        });
        throw vehiclesError;
      }

      setVehicles(vehiclesData || []);
    } catch (error: any) {
      console.error("Error in loadData:", {
        name: error.name,
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      if (error.message) {
        toast.error(error.message);
      } else {
        toast.error("Failed to load resident data");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [resolvedParams.id, supabase]);

  const handleAddVehicle = async () => {
    try {
      setLoading(true);
      const isPrimary = vehicles.length === 0;

      if (isPrimary) {
        // If this is the first vehicle, set it as primary
        await supabase
          .from("vehicles")
          .update({ is_primary: false })
          .eq("resident_id", resolvedParams.id);
      }

      const { error } = await supabase
        .from("vehicles")
        .insert({
          resident_id: resolvedParams.id,
          vehicle_type: formData.vehicle_type,
          make: formData.make,
          model: formData.model,
          color: formData.color || null,
          license_plate: formData.license_plate,
          parking_spot: formData.parking_spot || null,
          is_primary: isPrimary,
        });

      if (error) throw error;

      toast.success("Vehicle added successfully");
      setIsDialogOpen(false);
      setEditingVehicle(null);
      setFormData({
        vehicle_type: 'car',
        make: '',
        model: '',
        color: '',
        license_plate: '',
        parking_spot: '',
      });
      await loadData();
    } catch (error: any) {
      console.error("Error adding vehicle:", error);
      toast.error(error.message || "Failed to add vehicle");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVehicle = async () => {
    if (!editingVehicle) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('vehicles')
        .update({
          vehicle_type: formData.vehicle_type,
          make: formData.make,
          model: formData.model,
          color: formData.color || null,
          license_plate: formData.license_plate,
          parking_spot: formData.parking_spot || null,
        })
        .eq('id', editingVehicle.id);

      if (error) throw error;

      toast.success('Vehicle updated successfully');
      
      setIsDialogOpen(false);
      setEditingVehicle(null);
      setFormData({
        vehicle_type: 'car',
        make: '',
        model: '',
        color: '',
        license_plate: '',
        parking_spot: '',
      });
      loadData();
      
    } catch (error: any) {
      console.error('Error updating vehicle:', error);
      toast.error(error.message || 'Failed to update vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Vehicle deleted successfully');
      
      loadData();
      
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast.error(error.message || 'Failed to delete vehicle');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (vehicleId: string) => {
    try {
      setLoading(true);
      
      // First, unset primary flag for all vehicles
      const { error: updateAllError } = await supabase
        .from('vehicles')
        .update({ is_primary: false })
        .eq('resident_id', resolvedParams.id);

      if (updateAllError) throw updateAllError;

      // Then, set the selected vehicle as primary
      const { error } = await supabase
        .from('vehicles')
        .update({ is_primary: true })
        .eq('id', vehicleId);

      if (error) throw error;

      toast.success('Primary vehicle updated successfully');
      
      loadData();
      
    } catch (error: any) {
      console.error('Error setting primary vehicle:', error);
      toast.error(error.message || 'Failed to update primary vehicle');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      vehicle_type: vehicle.vehicle_type,
      make: vehicle.make,
      model: vehicle.model,
      color: vehicle.color || '',
      license_plate: vehicle.license_plate,
      parking_spot: vehicle.parking_spot || '',
    });
    setIsDialogOpen(true);
  };

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Checking permissions...</p>
      </div>
    );
  }

  if (loading && !resident) {
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
          <Link href="/dashboard/residents">Back to Residents</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/dashboard/vehicles">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Vehicles</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vehicle Management</h1>
            <p className="text-muted-foreground">
              {resident.name} - Unit {resident.unit_number}
            </p>
          </div>
        </div>
        {isResidentSelf && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </DialogTitle>
                <DialogDescription>
                  {editingVehicle 
                    ? 'Update the vehicle details below'
                    : 'Enter the vehicle details below to register a new vehicle'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="vehicleType">Vehicle Type</Label>
                  <Select
                    value={formData.vehicle_type}
                    onValueChange={(value) => setFormData({ ...formData, vehicle_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="car">Car</SelectItem>
                      <SelectItem value="bike">Bike</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g., Toyota"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., Camry"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color || ""}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value || null })}
                      placeholder="e.g., Silver"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parkingSpot">Parking Spot</Label>
                    <Input
                      id="parkingSpot"
                      value={formData.parking_spot || ""}
                      onChange={(e) => setFormData({ ...formData, parking_spot: e.target.value || null })}
                      placeholder="e.g., P-101"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="licensePlate">License Plate</Label>
                  <Input
                    id="licensePlate"
                    value={formData.license_plate}
                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value })}
                    placeholder="e.g., ABC123"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingVehicle(null);
                    setFormData({
                      vehicle_type: 'car',
                      make: '',
                      model: '',
                      color: '',
                      license_plate: '',
                      parking_spot: '',
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={editingVehicle ? handleUpdateVehicle : handleAddVehicle}
                  disabled={loading}
                >
                  {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicles</CardTitle>
          <CardDescription>
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vehicles registered for this resident
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Make & Model</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Parking Spot</TableHead>
                  <TableHead>Status</TableHead>
                  {isResidentSelf && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {vehicle.vehicle_type === 'car' ? (
                          <Car className="h-4 w-4" />
                        ) : vehicle.vehicle_type === 'bike' ? (
                          <Bike className="h-4 w-4" />
                        ) : (
                          <Car className="h-4 w-4" />
                        )}
                        <span className="capitalize">{vehicle.vehicle_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {vehicle.make} {vehicle.model}
                    </TableCell>
                    <TableCell>{vehicle.license_plate}</TableCell>
                    <TableCell>{vehicle.color || '-'}</TableCell>
                    <TableCell>{vehicle.parking_spot || '-'}</TableCell>
                    <TableCell>
                      {vehicle.is_primary ? (
                        <Badge>Primary</Badge>
                      ) : isResidentSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetPrimary(vehicle.id)}
                        >
                          <StarOff className="h-4 w-4 mr-1" />
                          Set Primary
                        </Button>
                      )}
                    </TableCell>
                    {isResidentSelf && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(vehicle)}
                          >
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVehicle(vehicle.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 