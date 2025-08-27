import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { isReady } = await request.json()

    // Update player ready status
    const { data: player, error } = await supabaseAdmin
      .from('lobby_players')
      .update({ is_ready: isReady })
      .eq('lobby_id', id)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating player ready status:', error)
      return NextResponse.json({ error: 'Failed to update ready status' }, { status: 500 })
    }

    return NextResponse.json({ player })
  } catch (error) {
    console.error('Error in ready status update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
