import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    // Opt all Supabase fetch calls out of the Next.js Data Cache so server
    // components and route handlers always read fresh rows from Postgres.
    fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
  },
});
