import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

    const { isReady } = await request.json()

    // Update player ready status
    const player = await prisma.lobbyPlayer.updateMany({
      where: {
        lobbyId: id,
        userId: session.user.id
      },
      data: {
        isReady: isReady
      }
    })

    if (player.count === 0) {
      return NextResponse.json({ error: 'Player not found in lobby' }, { status: 404 })
    }

    return NextResponse.json({ player })
  } catch (error) {
    console.error('Error in ready status update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
