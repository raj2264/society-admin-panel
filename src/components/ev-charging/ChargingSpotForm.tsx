import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CreateEVChargingSpotDTO, ChargingSpotStatus } from '@/types/ev-charging';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const chargingSpotSchema = z.object({
    location_name: z.string().min(1, 'Location name is required'),
    charger_type: z.string().min(1, 'Charger type is required'),
    capacity_kw: z.coerce.number().min(0, 'Capacity must be positive'),
    number_of_ports: z.coerce.number().int().min(1, 'Must have at least 1 port'),
    status: z.enum(['available', 'in_use', 'maintenance', 'offline'] as const),
    hourly_rate: z.coerce.number().min(0, 'Hourly rate must be positive'),
});

interface ChargingSpotFormProps {
    initialData?: CreateEVChargingSpotDTO;
    onSubmit: (data: CreateEVChargingSpotDTO) => Promise<void>;
    isSubmitting?: boolean;
}

export function ChargingSpotForm({ initialData, onSubmit, isSubmitting }: ChargingSpotFormProps) {
    const form = useForm<CreateEVChargingSpotDTO>({
        resolver: zodResolver(chargingSpotSchema) as any,
        defaultValues: initialData || {
            location_name: '',
            charger_type: '',
            capacity_kw: 0,
            number_of_ports: 1,
            status: 'available',
            hourly_rate: 0,
        },
    });

    const handleSubmit = async (data: CreateEVChargingSpotDTO) => {
        try {
            await onSubmit(data);
            if (!initialData) {
                form.reset();
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{initialData ? 'Edit Charging Spot' : 'Add New Charging Spot'}</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="location_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Location Name</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="e.g., Basement Parking A1" 
                                            {...field} 
                                            aria-describedby="location-name-description"
                                        />
                                    </FormControl>
                                    <FormDescription id="location-name-description">
                                        Enter a descriptive name for the charging spot location
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="charger_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Charger Type</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="e.g., Type 2, CCS, CHAdeMO" 
                                            {...field}
                                            aria-describedby="charger-type-description"
                                        />
                                    </FormControl>
                                    <FormDescription id="charger-type-description">
                                        Specify the type of charging connector available
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="capacity_kw"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Capacity (kW)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            {...field}
                                            aria-describedby="capacity-description"
                                        />
                                    </FormControl>
                                    <FormDescription id="capacity-description">
                                        Enter the charging capacity in kilowatts
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="number_of_ports"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Number of Ports</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            min="1"
                                            step="1"
                                            {...field}
                                            aria-describedby="ports-description"
                                        />
                                    </FormControl>
                                    <FormDescription id="ports-description">
                                        Number of charging ports available at this spot
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger aria-describedby="status-description">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="available">Available</SelectItem>
                                            <SelectItem value="in_use">In Use</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                            <SelectItem value="offline">Offline</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormDescription id="status-description">
                                        Current operational status of the charging spot
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="hourly_rate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hourly Rate (₹)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            {...field}
                                            aria-describedby="rate-description"
                                        />
                                    </FormControl>
                                    <FormDescription id="rate-description">
                                        Charging rate per hour in Indian Rupees
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Add'} Charging Spot
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
} 