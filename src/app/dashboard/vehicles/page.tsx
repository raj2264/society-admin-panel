'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Bike, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

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
  resident: {
    id: string;
    name: string;
    unit_number: string;
  };
}

export default function VehiclesPage() {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          resident:residents(id, name, unit_number)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      setVehicles(data || []);
      
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({
        title: 'Error',
        description: 'Failed to load vehicles',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = 
      vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.resident.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.resident.unit_number.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesType = 
      vehicleTypeFilter === 'all' || 
      vehicle.vehicle_type === vehicleTypeFilter;
      
    return matchesSearch && matchesType;
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
        <p className="text-muted-foreground">
          Manage and view all registered vehicles in the society
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicles</CardTitle>
          <CardDescription>
            {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by license plate, make, model, resident name or unit..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="w-full sm:w-44">
              <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Filter by type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="car">Cars</SelectItem>
                  <SelectItem value="bike">Bikes</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center p-3 border rounded-lg">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-1/4 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vehicles found matching your search criteria
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Make & Model</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Parking Spot</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow 
                      key={vehicle.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/dashboard/residents/${vehicle.resident.id}/vehicles`)}
                    >
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
                      <TableCell>
                        <div>
                          <p className="font-medium">{vehicle.resident.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Unit {vehicle.resident.unit_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.parking_spot || '-'}</TableCell>
                      <TableCell>
                        {vehicle.is_primary ? (
                          <Badge>Primary</Badge>
                        ) : (
                          <span className="text-muted-foreground">Secondary</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 