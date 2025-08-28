import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { findLobbyByIdOrCode } from '@/lib/lobby-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions) as any
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find lobby
    const lobby = await findLobbyByIdOrCode(params.id, {
      members: true
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // Remove user from lobby
    const deletedMember = await prisma.lobbyMember.deleteMany({
      where: {
        userId: user.id,
        lobbyId: lobby.id
      }
    })

    if (deletedMember.count === 0) {
      return NextResponse.json({ error: 'You are not in this lobby' }, { status: 400 })
    }

    // If the user leaving is the host and there are other members, transfer host
    if (lobby.hostId === user.id) {
      const remainingMembers = await prisma.lobbyMember.findMany({
        where: { lobbyId: lobby.id },
        include: { user: true }
      })

      if (remainingMembers.length > 0) {
        // Transfer host to the first remaining member
        await prisma.lobby.update({
          where: { id: lobby.id },
          data: { hostId: remainingMembers[0].userId }
        })
      } else {
        // No members left - clean up the entire lobby
        // First clean up any ongoing games
        const ongoingGames = await prisma.game.findMany({
          where: { 
            lobbyId: lobby.id,
            status: { in: ['WAITING', 'LOADING', 'PLAYING'] }
          },
          include: {
            rounds: true,
            participants: true
          }
        })

        // Clean up games if any
        for (const game of ongoingGames) {
          // Delete votes for all rounds
          for (const round of game.rounds) {
            await prisma.vote.deleteMany({
              where: { roundId: round.id }
            })
          }
          
          // Delete rounds
          await prisma.round.deleteMany({
            where: { gameId: game.id }
          })
          
          // Delete participants
          await prisma.gameParticipant.deleteMany({
            where: { gameId: game.id }
          })
          
          // Delete game
          await prisma.game.delete({
            where: { id: game.id }
          })
        }

        // Delete the lobby completely
        await prisma.lobby.delete({
          where: { id: lobby.id }
        })

        console.log(`Cleaned up empty lobby: ${lobby.name} (${lobby.id})`)
        return NextResponse.json({ success: true, lobbyDeleted: true })
      }
    }

    // Trigger Pusher event
    await pusherServer.trigger(`lobby-${lobby.id}`, 'member-left', {
      userId: user.id
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error leaving lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
