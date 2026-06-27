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
          created_at: string;
          id: string;
          title: string;
          watched_by: string[];
        };
        Insert: {
          created_at?: string;
          id?: string;
          title: string;
          watched_by?: string[];
        };
        Update: {
          created_at?: string;
          id?: string;
          title?: string;
          watched_by?: string[];
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
