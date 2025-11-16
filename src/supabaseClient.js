import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zylwkjgetiiewdlzxmdr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5bHdramdldGlpZXdkbHp4bWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTUxNzgsImV4cCI6MjA3ODc5MTE3OH0.INZXbuQ77qzAzIS-9K_KMbG67p4egFLkB55436BkXvA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);