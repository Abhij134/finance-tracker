import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ngegqphmpvqmwkkxoabn.supabase.co',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nZWdxcGhtcHZxbXdra3hvYWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MzY4MDgsImV4cCI6MjA4ODMxMjgwOH0.am5NeqbPzMDiUNK1oMol0nv4m2-oIcxR8ERCOlUhM9U'
    )
}
