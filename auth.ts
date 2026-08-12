import { createClient } from '@/utils/supabase/server'
import { cache } from 'react'

export const auth = cache(async () => {
  try {
    const supabase = await createClient();
    let user = null;
    const { data } = await supabase.auth.getUser();
    user = data.user;
    return { user };
  } catch (e: any) {
    if (e?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw e;
    }
    console.error("Auth error:", e);
    return { user: null };
  }
});
