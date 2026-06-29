import { supabase } from "@/lib/supabase/client";
import {
  isAnilistProfileStats,
  type AnilistProfileStats,
} from "@/lib/anilist/profile-stats";
import type { Member } from "@/lib/types";

type MemberRow = {
  id: string;
  name: string;
  created_at: string;
  profile_stats?: unknown;
};

function mapRow(row: MemberRow): Member {
  const profileStats = isAnilistProfileStats(row.profile_stats)
    ? row.profile_stats
    : null;
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    profileStats,
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

export async function fetchAllowedMemberNames(): Promise<string[] | null> {
  const { data, error } = await supabase
    .from("allowed_members")
    .select("name")
    .order("name", { ascending: true });

  if (error) {
    if (
      error.message.includes("does not exist") ||
      error.code === "42P01" ||
      error.code === "PGRST205"
    ) {
      return null;
    }
    throw new Error(error.message);
  }

  return (data as { name: string }[]).map((row) => row.name);
}

export async function registerMember(name: string): Promise<Member> {
  const trimmed = name.trim();

  const { data, error } = await supabase
    .from("members")
    .upsert({ name: trimmed }, { onConflict: "name" })
    .select("*")
    .single();

  if (error) {
    if (
      error.code === "42501" ||
      error.message.toLowerCase().includes("policy")
    ) {
      throw new Error(
        "Dieser Name ist nicht freigeschaltet. Bitte einen erlaubten Namen verwenden.",
      );
    }
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
