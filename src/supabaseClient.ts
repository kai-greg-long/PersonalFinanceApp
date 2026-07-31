import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Allow fallback to window globals for cases where files are opened directly
// (e.g., file://) or envs aren't injected. Do NOT add secrets to repo.
const win = typeof window !== 'undefined' ? (window as any) : undefined;
const url = supabaseUrl ?? win?.VITE_SUPABASE_URL ?? '';
const key = supabaseAnonKey ?? win?.VITE_SUPABASE_ANON_KEY ?? '';

let _supabase: any;
if (url && key) {
	_supabase = createClient(url, key);
} else {
	// Provide a safe stub so modules can import without failing at parse/import time.
	// Runtime calls will return an error object so callers can show alerts/messages.
	const missingErr = new Error('Missing Supabase configuration (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)');
	_supabase = {
		auth: {
			signInWithPassword: async () => ({ data: null, error: missingErr }),
			signOut: async () => ({ error: missingErr }),
		},
		from: () => ({
			select: () => ({ maybeSingle: async () => ({ data: null, error: missingErr }) }),
		}),
	};
}

export const supabase = _supabase;