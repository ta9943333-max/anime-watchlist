import { supabase } from "@/lib/supabase/client";
import type { Member } from "@/lib/types";

type MemberRow = {
  id: string;
  name: string;
  created_at: string;
};

function mapRow(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as MemberRow[]).map(mapRow);
}

export async function registerMember(name: string): Promise<Member> {
  const trimmed = name.trim();

  const { data, error } = await supabase
    .from("members")
    .upsert({ name: trimmed }, { onConflict: "name" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data as MemberRow);
}

export function subscribeToMemberChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel("anime-watchlist-members")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "members" },
      () => {
        onChange();
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
