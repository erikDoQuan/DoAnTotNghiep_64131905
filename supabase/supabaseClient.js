import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://jttmfdyyehzmjlysucid.supabase.co';
const supabaseAnonKey = 'sb_publishable_9SKuUkb04r7N8MoKPDkAfg_5K4_-P-7'; // Thay bằng Anon Key của bạn (User should replace this or I should look for it if provided)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});
