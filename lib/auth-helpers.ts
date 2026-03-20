import { type SupabaseClient } from "@supabase/supabase-js"

// Ensure the user row exists in the User table
export async function ensureUser(supabase: SupabaseClient, userId: string) {
    const { data } = await supabase.from('User').select('id').eq('id', userId).single();
    if (!data) {
        await supabase.from('User').insert({ id: userId, password: 'default_oauth_password' });
    }
}
