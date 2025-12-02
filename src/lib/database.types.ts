export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'ADMIN' | 'RANCHHAND' | 'VIEWER' | 'VET';
export type AnimalSource = 'BORN' | 'PURCHASED';
export type AnimalStatus = 'PRESENT' | 'SOLD' | 'DEAD';
export type AnimalSex = 'BULL' | 'STEER' | 'HEIFER';

export interface Database {
  public: {
    Tables: {
      ranches: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_ranches: {
        Row: {
          user_id: string;
          ranch_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          user_id: string;
          ranch_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          ranch_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      ranch_settings: {
        Row: {
          ranch_id: string;
          report_line1: string;
          report_line2: string;
          adult_age_years: number;
          time_zone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          ranch_id: string;
          report_line1?: string;
          report_line2?: string;
          adult_age_years?: number;
          time_zone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ranch_id?: string;
          report_line1?: string;
          report_line2?: string;
          adult_age_years?: number;
          time_zone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      animals: {
        Row: {
          id: string;
          ranch_id: string;
          legacy_uid: string | null;
          source: AnimalSource;
          status: AnimalStatus;
          tag_number: string | null;
          tag_color: string | null;
          name: string | null;
          sex: AnimalSex;
          description: string | null;
          birth_date: string | null;
          weaning_date: string | null;
          exit_date: string | null;
          mother_id: string | null;
          weight_lbs: number | null;
          notes: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ranch_id: string;
          legacy_uid?: string | null;
          source: AnimalSource;
          status?: AnimalStatus;
          tag_number?: string | null;
          tag_color?: string | null;
          name?: string | null;
          sex: AnimalSex;
          description?: string | null;
          birth_date?: string | null;
          weaning_date?: string | null;
          exit_date?: string | null;
          mother_id?: string | null;
          weight_lbs?: number | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ranch_id?: string;
          legacy_uid?: string | null;
          source?: AnimalSource;
          status?: AnimalStatus;
          tag_number?: string | null;
          tag_color?: string | null;
          name?: string | null;
          sex?: AnimalSex;
          description?: string | null;
          birth_date?: string | null;
          weaning_date?: string | null;
          exit_date?: string | null;
          mother_id?: string | null;
          weight_lbs?: number | null;
          notes?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      medical_history: {
        Row: {
          id: string;
          animal_id: string;
          ranch_id: string;
          date: string;
          description: string;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          animal_id: string;
          ranch_id: string;
          date: string;
          description: string;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          animal_id?: string;
          ranch_id?: string;
          date?: string;
          description?: string;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      animal_photos: {
        Row: {
          id: string;
          animal_id: string;
          ranch_id: string;
          storage_url: string;
          thumbnail_url: string | null;
          caption: string | null;
          taken_at: string | null;
          taken_by_user_id: string | null;
          is_primary: boolean;
          is_synced: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          animal_id: string;
          ranch_id: string;
          storage_url: string;
          thumbnail_url?: string | null;
          caption?: string | null;
          taken_at?: string | null;
          taken_by_user_id?: string | null;
          is_primary?: boolean;
          is_synced?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          animal_id?: string;
          ranch_id?: string;
          storage_url?: string;
          thumbnail_url?: string | null;
          caption?: string | null;
          taken_at?: string | null;
          taken_by_user_id?: string | null;
          is_primary?: boolean;
          is_synced?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      count_report_snapshots: {
        Row: {
          id: string;
          ranch_id: string;
          snapshot_date: string;
          data: Json;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          ranch_id: string;
          snapshot_date?: string;
          data: Json;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          ranch_id?: string;
          snapshot_date?: string;
          data?: Json;
          created_by_user_id?: string | null;
          created_at?: string;
        };
      };
      terms_acceptances: {
        Row: {
          id: string;
          user_id: string;
          terms_version: string;
          accepted_at: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          terms_version: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          terms_version?: string;
          accepted_at?: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
    };
  };
}
