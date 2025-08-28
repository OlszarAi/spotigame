import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { isReady } = await req.json()

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update ready status
    const updatedMember = await prisma.lobbyMember.update({
      where: {
        userId_lobbyId: {
          userId: user.id,
          lobbyId: params.id
        }
      },
      data: { isReady },
      include: {
        user: true
      }
    })

    // Trigger Pusher event
    await pusherServer.trigger(`lobby-${params.id}`, 'member-ready-changed', {
      userId: user.id,
      isReady
    })

    return NextResponse.json(updatedMember)
  } catch (error) {
    console.error('Error updating ready status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
