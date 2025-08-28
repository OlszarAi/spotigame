import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    
    // Check tokens in accounts table
    const { data: accounts, error } = await supabaseAdmin
      .from('accounts')
      .select(`
        userId,
        provider,
        access_token,
        refresh_token,
        expires_at
      `)
      .eq('provider', 'spotify')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const tokenStats = accounts?.map(account => ({
      userId: account.userId,
      hasAccessToken: !!account.access_token,
      hasRefreshToken: !!account.refresh_token,
      accessTokenLength: account.access_token?.length || 0,
      refreshTokenLength: account.refresh_token?.length || 0,
      expiresAt: account.expires_at,
      isExpired: account.expires_at ? Date.now() / 1000 > account.expires_at : 'unknown'
    }))

    return NextResponse.json({
      success: true,
      tokenStats,
      totalAccounts: accounts?.length || 0
    })
  } catch (error) {
    console.error('Error checking tokens:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
