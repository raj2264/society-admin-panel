export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ev_charging_spots: {
        Row: {
          id: string
          society_id: string
          location_name: string
          charger_type: string
          capacity_kw: number
          number_of_ports: number
          status: 'available' | 'in_use' | 'maintenance' | 'offline'
          hourly_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          society_id: string
          location_name: string
          charger_type: string
          capacity_kw: number
          number_of_ports: number
          status?: 'available' | 'in_use' | 'maintenance' | 'offline'
          hourly_rate: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          society_id?: string
          location_name?: string
          charger_type?: string
          capacity_kw?: number
          number_of_ports?: number
          status?: 'available' | 'in_use' | 'maintenance' | 'offline'
          hourly_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      // Add other tables as needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
} 