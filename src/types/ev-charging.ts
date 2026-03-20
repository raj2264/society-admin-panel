export type ChargingSpotStatus = 'available' | 'in_use' | 'maintenance' | 'offline';

export interface EVChargingSpot {
    id: string;
    society_id: string;
    location_name: string;
    charger_type: string;
    capacity_kw: number;
    number_of_ports: number;
    status: ChargingSpotStatus;
    hourly_rate: number;
    created_at: string;
    updated_at: string;
}

export interface CreateEVChargingSpotDTO {
    location_name: string;
    charger_type: string;
    capacity_kw: number;
    number_of_ports: number;
    status: ChargingSpotStatus;
    hourly_rate: number;
}

export interface UpdateEVChargingSpotDTO extends Partial<CreateEVChargingSpotDTO> {
    id: string;
} 