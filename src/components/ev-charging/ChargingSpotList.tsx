import { EVChargingSpot } from '@/types/ev-charging';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface ChargingSpotListProps {
    spots: EVChargingSpot[];
    onEdit: (spot: EVChargingSpot) => void;
    onDelete: (spotId: string) => Promise<void>;
    isDeleting?: boolean;
}

const statusColors = {
    available: 'bg-green-500',
    in_use: 'bg-blue-500',
    maintenance: 'bg-yellow-500',
    offline: 'bg-red-500',
};

const statusLabels = {
    available: 'Available',
    in_use: 'In Use',
    maintenance: 'Maintenance',
    offline: 'Offline',
};

export function ChargingSpotList({ spots, onEdit, onDelete, isDeleting }: ChargingSpotListProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
                <Card key={spot.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {spot.location_name}
                        </CardTitle>
                        <div className="flex space-x-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(spot)}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(spot.id)}
                                disabled={isDeleting}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Status</span>
                                <Badge className={statusColors[spot.status]}>
                                    {statusLabels[spot.status]}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Charger Type</span>
                                <span className="text-sm font-medium">{spot.charger_type}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Capacity</span>
                                <span className="text-sm font-medium">{spot.capacity_kw} kW</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Ports</span>
                                <span className="text-sm font-medium">{spot.number_of_ports}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Rate</span>
                                <span className="text-sm font-medium">₹{spot.hourly_rate}/hour</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
} 