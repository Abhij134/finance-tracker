import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
    console.log("Triggering OTP signup...");
    const { data, error } = await supabase.auth.signInWithOtp({
        email: `test_user_${Date.now()}@example.com`,
        options: {
            shouldCreateUser: true,
        },
    });

    if (error) {
        console.error("Auth Error:", error.message);
    } else {
        console.log("OTP sent successfully. User should have been created in auth.users.");
    }
}

testSignup();
