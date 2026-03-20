import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { ensureUser } from '@/lib/auth-helpers'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type') as string | null

  const supabase = await createClient()

  // Handle Token Hash (Magic Links & OTPs without a direct session)
  if (token_hash && type) {
    const { data: { session }, error } = await supabase.auth.verifyOtp({
      type: type as "email" | "magiclink" | "signup" | "recovery",
      token_hash,
    })

    if (!error && session?.user) {
      await ensureUser(supabase, session.user.id)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Handle Code Exchange (OAuth, etc)
  if (code) {
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session?.user) {
      await ensureUser(supabase, session.user.id)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Fallback to error page or back to login
  if (requestUrl.searchParams.get('error')) {
    return NextResponse.redirect(new URL(`/login?error=${requestUrl.searchParams.get('error_description')}`, request.url))
  }

  // Default redirect if auth succeeds or fails silently
  return NextResponse.redirect(new URL('/dashboard', request.url))
}