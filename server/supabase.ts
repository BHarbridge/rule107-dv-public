import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

// Do NOT process.exit on Vercel — it crashes the serverless function with an
// opaque FUNCTION_INVOCATION_FAILED. Instead, export a proxy that throws a
// clear 500 on the first method call so the error surfaces in responses.
function missingEnvProxy(): SupabaseClient {
  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL");
  if (!key) missing.push("SUPABASE_ANON_KEY");
  const msg = `Server misconfigured: missing env vars: ${missing.join(", ")}. Set them in the Vercel project Settings → Environment Variables, then redeploy.`;
  console.error(msg);
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(msg);
    },
  });
}

export const supabase: SupabaseClient =
  url && key
    ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    : missingEnvProxy();

export default supabase;
