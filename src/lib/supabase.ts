import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase côté serveur, avec la clé de service.
 *
 * Toutes les tables du site (commandes, contacts, newsletter) ont la RLS activée
 * SANS aucune politique publique : le navigateur n'y a aucun accès, seules les
 * routes API du serveur écrivent et lisent. La clé de service ne doit donc
 * jamais être exposée (pas de préfixe NEXT_PUBLIC_).
 */
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
