import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qdidjzavulpmdudwvezj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkaWRqemF2dWxwbWR1ZHd2ZXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MDAzNzMsImV4cCI6MjA5NTA3NjM3M30.hzEp23AcgUMxmIe1NLHY5zXqL2C7SytGiX5E8frxBiA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);