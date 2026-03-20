import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export async function createClient(rememberMe: boolean = true) {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngegqphmpvqmwkkxoabn.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZWdxcGhtcHZxbXdra3hvYWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzY4MDgsImV4cCI6MjA4ODMxMjgwOH0.am5NeqbPzMDiUNK1oMol0nv4m2-oIcxR8ERCOlUhM9U',
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            const finalOptions = { ...options };
                            // If remember me is false, we want session cookies (expires when browser closes)
                            if (!rememberMe) {
                                delete finalOptions.maxAge;
                                delete finalOptions.expires;
                            }
                            cookieStore.set(name, value, finalOptions);
                        })
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    )
}
