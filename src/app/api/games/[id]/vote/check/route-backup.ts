import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const roundId = searchParams.get('roundId')
    
    if (!roundId) {
      return NextResponse.json({ error: 'Round ID is required' }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: (session as any).user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has voted for this round
    const existingVote = await prisma.vote.findUnique({
      where: { 
        roundId_voterId: {
          roundId: roundId,
          voterId: user.id
        }
      }
    })

    return NextResponse.json({ hasVoted: !!existingVote })
  } catch (error) {
    console.error('Error checking vote status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
