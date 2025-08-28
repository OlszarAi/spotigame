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

    const { guessedUserId } = await req.json()
    
    if (!guessedUserId) {
      return NextResponse.json({ error: 'Guessed user ID is required' }, { status: 400 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get game and all rounds
    const game = await prisma.game.findUnique({
      where: { id: params.id },
      include: {
        rounds: {
          orderBy: { roundNumber: 'asc' }
        }
      }
    })

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    if (game.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 })
    }

    const currentRound = game.rounds.find((r: any) => r.roundNumber === game.currentRound)
    
    if (!currentRound) {
      return NextResponse.json({ error: 'No active round' }, { status: 400 })
    }

    // Check if user already voted for this round
    const existingVote = await prisma.vote.findUnique({
      where: { 
        roundId_voterId: {
          roundId: currentRound.id,
          voterId: user.id
        }
      }
    })

    if (existingVote) {
      return NextResponse.json({ error: 'You have already voted for this round' }, { status: 400 })
    }

    // Create vote with additional check to prevent race conditions
    try {
      await prisma.vote.create({
        data: {
          roundId: currentRound.id,
          voterId: user.id,
          guessedUserId: guessedUserId
        }
      })
    } catch (error: any) {
      // If unique constraint error, the user has already voted
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'You have already voted for this round' }, { status: 400 })
      }
      throw error
    }

    // Check if all players have voted
    const totalParticipants = await prisma.gameParticipant.count({
      where: { gameId: game.id }
    })

    const totalVotes = await prisma.vote.count({
      where: { roundId: currentRound.id }
    })

    // If all players have voted, end the round
    if (totalVotes >= totalParticipants) {
      // Check if round is already finished to avoid duplicate processing
      const currentRoundCheck = await prisma.round.findUnique({
        where: { id: currentRound.id }
      })
      
      if (currentRoundCheck?.status === 'FINISHED') {
        return NextResponse.json({ success: true, message: 'Round already finished' })
      }

      // Get all votes for scoring
      const votes = await prisma.vote.findMany({
        where: { roundId: currentRound.id },
        include: { voter: true }
      })

      // Calculate scores - players get points for correct guesses
      console.log(`Calculating scores for round ${currentRound.id}`)
      console.log(`Correct answer (track owner): ${currentRound.ownerId}`)
      console.log(`Total votes received: ${votes.length}`)
      
      for (const vote of votes) {
        console.log(`Vote from ${vote.voter.name} (${vote.voterId}) guessed: ${vote.guessedUserId}`)
        if (vote.guessedUserId === currentRound.ownerId) {
          console.log(`Correct guess! Awarding 10 points to ${vote.voter.name}`)
          // Correct guess - award points
          await prisma.gameParticipant.update({
            where: {
              gameId_userId: {
                gameId: game.id,
                userId: vote.voterId
              }
            },
            data: {
              score: { increment: 10 }
            }
          })
        } else {
          console.log(`Incorrect guess from ${vote.voter.name}`)
        }
      }

      // Mark round as finished
      await prisma.round.update({
        where: { id: currentRound.id },
        data: { 
          status: 'FINISHED',
          endedAt: new Date()
        }
      })

      // Check if this was the last round
      if (game.currentRound >= game.totalRounds) {
        // Game finished
        await prisma.game.update({
          where: { id: game.id },
          data: { status: 'FINISHED' }
        })

        // Get final scores
        const finalScores = await prisma.gameParticipant.findMany({
          where: { gameId: game.id },
          include: { user: true },
          orderBy: { score: 'desc' }
        })

        await pusherServer.trigger(`game-${game.id}`, 'game-ended', {
          finalScores
        })
      } else {
        // Start next round
        const nextRoundNumber = game.currentRound + 1
        await prisma.game.update({
          where: { id: game.id },
          data: { currentRound: nextRoundNumber }
        })

        const nextRound = await prisma.round.findFirst({
          where: { 
            gameId: game.id,
            roundNumber: nextRoundNumber
          }
        })

        if (nextRound) {
          await prisma.round.update({
            where: { id: nextRound.id },
            data: { startedAt: new Date() }
          })

          setTimeout(() => {
            pusherServer.trigger(`game-${game.id}`, 'round-started', {
              round: nextRound
            })
          }, 3000) // 3 second delay before next round
        }
      }

      // Emit round ended event
      await pusherServer.trigger(`game-${game.id}`, 'round-ended', {
        results: {
          correctAnswer: currentRound.ownerId,
          votes: votes.map((v: any) => ({
            voter: v.voter.name,
            guess: v.guessedUserId
          }))
        }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
