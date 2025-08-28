import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { getTopTracks, selectRandomTrack } from '@/lib/spotify'

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

    // Find lobby and verify user is host
    const lobby = await prisma.lobby.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: {
            user: {
              include: {
                accounts: true
              }
            }
          }
        }
      }
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    if (lobby.hostId !== user.id) {
      return NextResponse.json({ error: 'Only host can start the game' }, { status: 403 })
    }

    // Check if all members are ready
    const allReady = lobby.members.every((member: any) => member.isReady)
    if (!allReady) {
      return NextResponse.json({ error: 'All players must be ready' }, { status: 400 })
    }

    if (lobby.members.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
    }

    // Notify lobby that game is starting
    await pusherServer.trigger(`lobby-${params.id}`, 'game-starting', {})

    // Create game
    const game = await prisma.game.create({
      data: {
        lobbyId: lobby.id,
        totalRounds: lobby.roundCount,
        status: 'LOADING'
      }
    })

    // Add participants
    for (const member of lobby.members) {
      await prisma.gameParticipant.create({
        data: {
          gameId: game.id,
          userId: member.userId
        }
      })
    }

    // Collect tracks from all players
    const allTracks: Array<{
      track: any
      ownerId: string
    }> = []

    for (const member of lobby.members) {
      const spotifyAccount = member.user.accounts.find(
        (account: any) => account.provider === 'spotify'
      )

      if (spotifyAccount?.access_token) {
        try {
          const tracks = await getTopTracks(spotifyAccount.access_token, 20)
          
          // Select random tracks for this user (up to roundCount)
          const selectedTracks: any[] = []
          for (let i = 0; i < Math.min(lobby.roundCount, tracks.length); i++) {
            const randomTrack = selectRandomTrack(tracks.filter((t: any) => 
              !selectedTracks.find((st: any) => st.id === t.id)
            ))
            if (randomTrack) {
              selectedTracks.push(randomTrack)
              allTracks.push({
                track: randomTrack,
                ownerId: member.userId
              })
            }
          }
        } catch (error) {
          console.error(`Error fetching tracks for user ${member.userId}:`, error)
        }
      }
    }

    // Shuffle all tracks and take up to roundCount
    const shuffledTracks = allTracks.sort(() => Math.random() - 0.5)
    const gameTracks = shuffledTracks.slice(0, lobby.roundCount)

    // Create rounds
    for (let i = 0; i < gameTracks.length; i++) {
      const { track, ownerId } = gameTracks[i]
      await prisma.round.create({
        data: {
          gameId: game.id,
          roundNumber: i + 1,
          trackId: track.id,
          trackName: track.name,
          trackArtist: track.artists.map((a: any) => a.name).join(', '),
          trackUri: track.uri,
          ownerId: ownerId,
          timeLimit: 30
        }
      })
    }

    // Update game status to PLAYING
    await prisma.game.update({
      where: { id: game.id },
      data: { status: 'PLAYING' }
    })

    // Notify lobby that game has started
    await pusherServer.trigger(`lobby-${params.id}`, 'game-started', {
      gameId: game.id
    })

    return NextResponse.json({ gameId: game.id })
  } catch (error) {
    console.error('Error starting game:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
