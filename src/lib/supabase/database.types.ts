export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      anime: {
        Row: {
          aired_from: string | null;
          aired_to: string | null;
          broadcast_day: string | null;
          broadcast_time: string | null;
          created_at: string;
          episode_duration_min: number | null;
          episodes: number | null;
          folder_id: string | null;
          genres: string[];
          id: string;
          mal_id: number | null;
          mal_season: string | null;
          mal_status: string | null;
          mal_year: number | null;
          member_statuses: Json;
          ratings: Json;
          series_key: string | null;
          title: string;
          title_english: string | null;
          total_duration_min: number | null;
          watched_by: string[];
        };
        Insert: {
          aired_from?: string | null;
          aired_to?: string | null;
          broadcast_day?: string | null;
          broadcast_time?: string | null;
          created_at?: string;
          episode_duration_min?: number | null;
          episodes?: number | null;
          folder_id?: string | null;
          genres?: string[];
          id?: string;
          mal_id?: number | null;
          mal_season?: string | null;
          mal_status?: string | null;
          mal_year?: number | null;
          member_statuses?: Json;
          ratings?: Json;
          series_key?: string | null;
          title: string;
          title_english?: string | null;
          total_duration_min?: number | null;
          watched_by?: string[];
        };
        Update: {
          aired_from?: string | null;
          aired_to?: string | null;
          broadcast_day?: string | null;
          broadcast_time?: string | null;
          created_at?: string;
          episode_duration_min?: number | null;
          episodes?: number | null;
          folder_id?: string | null;
          genres?: string[];
          id?: string;
          mal_id?: number | null;
          mal_season?: string | null;
          mal_status?: string | null;
          mal_year?: number | null;
          member_statuses?: Json;
          ratings?: Json;
          series_key?: string | null;
          title?: string;
          title_english?: string | null;
          total_duration_min?: number | null;
          watched_by?: string[];
        };
        Relationships: [];
      };
      folders: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      members: {
        Row: {
          created_at: string;
          id: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      allowed_members: {
        Row: {
          created_at: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          name: string;
        };
        Update: {
          created_at?: string;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type AnimeRow = Database["public"]["Tables"]["anime"]["Row"];
export type MemberRow = Database["public"]["Tables"]["members"]["Row"];
export type FolderRow = Database["public"]["Tables"]["folders"]["Row"];
