import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase.auth.signUp({
        email: "direct_test_meta@test.com",
        password: "securepassword123",
        options: {
            data: {
                username: "DirectTestUser",
                userId: "direct_id_123"
            }
        }
    });

    console.log("Supabase Client Response:");
    console.log(JSON.stringify({ data, error }, null, 2));
}

require('dotenv').config({ path: '.env.local' });
main();
