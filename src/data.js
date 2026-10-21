/**
 * Data layer – Supabase Auth + optional demo fallback
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, USE_SUPABASE } from "./supabase-config.js";

let supabase = null;
let connectionStatus = "demo";

export async function initData() {
  if (!USE_SUPABASE) {
    connectionStatus = "demo";
    return { mode: "demo", client: null };
  }
  try {
    const { createClient } = await import(
      "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
    );
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    const { error } = await supabase.auth.getSession();
    if (error) throw error;
    connectionStatus = "live";
    return { mode: "live", client: supabase };
  } catch (err) {
    connectionStatus = "error";
    console.warn("[ScholarTrack] Supabase unavailable – demo mode", err);
    supabase = null;
    return { mode: "demo", client: null, error: String(err) };
  }
}

export function getClient() {
  return supabase;
}

export function getConnectionStatus() {
  return connectionStatus;
}

export function isLive() {
  return connectionStatus === "live" && Boolean(supabase);
}

/** Email/password sign-in; returns { user, profile } or throws */
export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error("Supabase not connected");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, email")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (pErr) throw pErr;
  if (!profile) {
    await supabase.auth.signOut();
    throw new Error("No profile for this user. Ask staff to link your account in profiles.");
  }
  return { user: data.user, profile };
}

export async function signOutLive() {
  if (supabase) await supabase.auth.signOut();
}

export async function getSessionProfile() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, full_name, role, email")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return profile;
}
