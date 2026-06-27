import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase-Umgebungsvariablen fehlen. Prüfe .env.local (URL + ANON_KEY).",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
