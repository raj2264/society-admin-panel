'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EVChargingSpot, CreateEVChargingSpotDTO, ChargingSpotStatus } from '@/types/ev-charging';
import { ChargingSpotForm } from '@/components/ev-charging/ChargingSpotForm';
import { ChargingSpotList } from '@/components/ev-charging/ChargingSpotList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useSupabase } from '@/lib/supabase-provider';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info } from "lucide-react";

export default function EVChargingPage() {
    const { supabase, session } = useSupabase();
    const [spots, setSpots] = useState<EVChargingSpot[]>([]);
    const [selectedSpot, setSelectedSpot] = useState<EVChargingSpot | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [spotToDelete, setSpotToDelete] = useState<string | null>(null);
    const [societyId, setSocietyId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        let mounted = true;

        const initialize = async () => {
            // Don't redirect immediately if session is null - it might be loading
            if (session === null) {
                // Only redirect if we're sure there's no session after a brief delay
                const timeoutId = setTimeout(() => {
                    if (mounted && !session) {
                        router.replace('/auth/login');
                    }
                }, 1000); // Wait 1 second to allow session to load
                return () => clearTimeout(timeoutId);
            }

            if (!session) return; // Still loading, don't proceed

            try {
                setIsLoading(true);
                // Get society admin data
                const { data: adminData, error: adminError } = await supabase
                    .from('society_admins')
                    .select('society_id')
                    .eq('user_id', session.user.id)
                    .single();

                if (adminError) {
                    console.error('Error fetching admin data:', adminError);
                    if (mounted) {
                        toast({
                            title: 'Error',
                            description: 'Failed to fetch society data',
                            variant: 'destructive',
                        });
                    }
                    return;
                }

                if (!adminData?.society_id) {
                    if (mounted) {
                        toast({
                            title: 'Error',
                            description: 'No society found for this admin',
                            variant: 'destructive',
                        });
                    }
                    return;
                }

                if (mounted) {
                    setSocietyId(adminData.society_id);
                    await fetchSpots(adminData.society_id);
                }
            } catch (error) {
                console.error('Error initializing:', error);
                if (mounted) {
                    toast({
                        title: 'Error',
                        description: 'Failed to initialize the page',
                        variant: 'destructive',
                    });
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        initialize();

        return () => {
            mounted = false;
        };
    }, [session, router, toast, supabase]);

    const fetchSpots = async (societyId: string) => {
        try {
            const { data, error } = await supabase
                .from('ev_charging_spots')
                .select('*')
                .eq('society_id', societyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSpots(data || []);
        } catch (error) {
            console.error('Error fetching charging spots:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch charging spots',
                variant: 'destructive',
            });
        }
    };

    const handleSubmit = async (data: CreateEVChargingSpotDTO) => {
        if (!societyId) {
            toast({
                title: 'Error',
                description: 'Society ID is missing',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const spotData = {
                ...data,
                society_id: societyId,
            };

            if (selectedSpot) {
                // Update existing spot
                const { error } = await supabase
                    .from('ev_charging_spots')
                    .update(spotData)
                    .eq('id', selectedSpot.id)
                    .eq('society_id', societyId); // Ensure we only update our society's spots

                if (error) throw error;
                toast({
                    title: 'Success',
                    description: 'Charging spot updated successfully',
                });
            } else {
                // Create new spot
                const { error } = await supabase
                    .from('ev_charging_spots')
                    .insert([spotData]);

                if (error) throw error;
                toast({
                    title: 'Success',
                    description: 'Charging spot added successfully',
                });
            }
            setIsDialogOpen(false);
            setSelectedSpot(null);
            await fetchSpots(societyId);
        } catch (error) {
            console.error('Error saving charging spot:', error);
            toast({
                title: 'Error',
                description: 'Failed to save charging spot',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (spotId: string) => {
        setSpotToDelete(spotId);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!spotToDelete || !societyId) return;
        
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('ev_charging_spots')
                .delete()
                .eq('id', spotToDelete)
                .eq('society_id', societyId); // Ensure we only delete our society's spots

            if (error) throw error;
            toast({
                title: 'Success',
                description: 'Charging spot deleted successfully',
            });
            await fetchSpots(societyId);
        } catch (error) {
            console.error('Error deleting charging spot:', error);
            toast({
                title: 'Error',
                description: 'Failed to delete charging spot',
                variant: 'destructive',
            });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            setSpotToDelete(null);
        }
    };

    const handleEdit = (spot: EVChargingSpot) => {
        setSelectedSpot(spot);
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-6">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                        <p className="text-lg text-muted-foreground">Loading charging spots...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!societyId && session === null) {
        return (
            <div className="container mx-auto py-6">
                <Card className="max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle className="text-center text-2xl">No Society Found</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <Info className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-muted-foreground">
                            You need to be associated with a society to manage charging spots.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const totalSpots = spots.length;
    const activeSpots = spots.filter(spot => spot.status === 'available').length;
    const occupiedSpots = spots.filter(spot => spot.status === 'in_use').length;
    const maintenanceSpots = spots.filter(spot => spot.status === 'maintenance').length;

    return (
        <div className="container mx-auto py-6 space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold tracking-tight">EV Charging Spots</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your society's electric vehicle charging infrastructure
                    </p>
                </div>
                <div className="flex justify-center sm:justify-end">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="lg" onClick={() => setSelectedSpot(null)}>
                                <Plus className="mr-2 h-5 w-5" />
                                Add Charging Spot
                            </Button>
                        </DialogTrigger>
                        <DialogContent 
                            className="max-h-[90vh] overflow-y-auto"
                            description={selectedSpot 
                                ? 'Update the details of the existing charging spot.'
                                : 'Fill in the details to add a new charging spot to your society.'}
                        >
                            <DialogHeader className="sticky top-0 bg-background z-10 pb-4">
                                <DialogTitle className="text-2xl">
                                    {selectedSpot ? 'Edit Charging Spot' : 'Add New Charging Spot'}
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground">
                                    {selectedSpot 
                                        ? 'Update the details of the existing charging spot.'
                                        : 'Fill in the details to add a new charging spot to your society.'}
                                </p>
                            </DialogHeader>
                            <div className="pr-6">
                                <ChargingSpotForm
                                    initialData={selectedSpot || undefined}
                                    onSubmit={handleSubmit}
                                    isSubmitting={isSubmitting}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Spots</CardTitle>
                        <Badge variant="outline" className="text-lg font-semibold">
                            {totalSpots}
                        </Badge>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-3xl font-bold">{totalSpots}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total charging spots in your society
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available</CardTitle>
                        <Badge variant="secondary" className="text-lg font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                            {activeSpots}
                        </Badge>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-3xl font-bold text-green-600">{activeSpots}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Spots currently available for charging
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">In Use</CardTitle>
                        <Badge variant="secondary" className="text-lg font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                            {occupiedSpots}
                        </Badge>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{occupiedSpots}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Spots currently in use
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                        <Badge variant="destructive" className="text-lg font-semibold">
                            {maintenanceSpots}
                        </Badge>
                    </CardHeader>
                    <CardContent className="text-center">
                        <div className="text-3xl font-bold text-red-600">{maintenanceSpots}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Spots under maintenance
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <h2 className="text-xl font-semibold text-center sm:text-left">Charging Spots</h2>
                    <Badge variant="outline" className="text-sm">
                        {totalSpots} {totalSpots === 1 ? 'Spot' : 'Spots'}
                    </Badge>
                </div>
                <ChargingSpotList
                    spots={spots}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isDeleting={isDeleting}
                />
            </div>

            <AlertDialog 
                open={isDeleteDialogOpen} 
                onOpenChange={setIsDeleteDialogOpen}
            >
                <AlertDialogContent 
                    aria-describedby="delete-dialog-description"
                    description="Are you sure you want to delete this charging spot? This action cannot be undone and will permanently remove the charging spot and all its associated data."
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl">Delete Charging Spot</AlertDialogTitle>
                        <AlertDialogDescription id="delete-dialog-description" className="text-base">
                            Are you sure you want to delete this charging spot? This action cannot be undone and will permanently remove the charging spot and all its associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
} 