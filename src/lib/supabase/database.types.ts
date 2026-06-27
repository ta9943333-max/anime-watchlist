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
          folder_id: string | null;
          id: string;
          title: string;
          watched_by: string[];
        };
        Insert: {
          created_at?: string;
          folder_id?: string | null;
          id?: string;
          title: string;
          watched_by?: string[];
        };
        Update: {
          created_at?: string;
          folder_id?: string | null;
          id?: string;
          title?: string;
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
