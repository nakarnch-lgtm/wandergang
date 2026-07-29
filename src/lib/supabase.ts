import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://replace-me.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'replace-me-with-your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
