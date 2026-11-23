import { createClient } from "@supabase/supabase-js";

// These two values are PUBLIC by design (safe in the browser). Real secrets never go here.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const authConfigured = Boolean(url && key);

// Placeholder values keep the app from crashing when settings are missing; the UI shows a clear message instead.
export const supabase = createClient(url || "http://localhost:54321", key || "missing-key");
