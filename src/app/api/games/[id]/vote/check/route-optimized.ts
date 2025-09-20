import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Cache for vote status
const voteStatusCache = new Map<string, { hasVoted: boolean, timestamp: number }>()
const CACHE_TTL = 3000 // 3 seconds

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

    // Find user by email - cache this too if needed
    const user = await prisma.user.findUnique({
      where: { email: (session as any).user.email },
      select: { id: true } // Only get what we need
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check cache first
    const cacheKey = `${roundId}-${user.id}`
    const cached = voteStatusCache.get(cacheKey)
    
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return NextResponse.json({ 
        hasVoted: cached.hasVoted,
        cached: true 
      })
    }

    // Check database
    const existingVote = await prisma.vote.findUnique({
      where: { 
        roundId_voterId: {
          roundId: roundId,
          voterId: user.id
        }
      },
      select: { id: true } // Only check existence
    })

    const hasVoted = !!existingVote

    // Cache the result
    voteStatusCache.set(cacheKey, {
      hasVoted,
      timestamp: Date.now()
    })

    // Clean old cache entries periodically
    if (Math.random() < 0.1) { // 10% chance
      const now = Date.now()
      const keysToDelete: string[] = []
      voteStatusCache.forEach((value, key) => {
        if (now - value.timestamp > CACHE_TTL * 2) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => voteStatusCache.delete(key))
    }

    return NextResponse.json({ hasVoted })
  } catch (error) {
    console.error('Error checking vote status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper endpoint to get round status and vote counts
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roundId } = await req.json()
    
    if (!roundId) {
      return NextResponse.json({ error: 'Round ID is required' }, { status: 400 })
    }

    // Get comprehensive round status in one query
    const roundStatus = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        votes: {
          select: { voterId: true }
        },
        game: {
          include: {
            participants: {
              select: { userId: true }
            }
          }
        }
      }
    })

    if (!roundStatus) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    const user = await prisma.user.findUnique({
      where: { email: (session as any).user.email },
      select: { id: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const hasVoted = roundStatus.votes.some((vote: any) => vote.voterId === user.id)
    const voteCount = roundStatus.votes.length
    const totalPlayers = roundStatus.game.participants.length
    const allVoted = voteCount >= totalPlayers

    return NextResponse.json({
      hasVoted,
      voteCount,
      totalPlayers,
      allVoted,
      roundStatus: roundStatus.status
    })
  } catch (error) {
    console.error('Error getting round status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
