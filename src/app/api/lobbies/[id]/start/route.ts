import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { getTopTracks, selectRandomTracks, shuffleArray, getValidAccessToken } from '@/lib/spotify'
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

    // Find lobby and verify user is host
    const lobby = await findLobbyByIdOrCode(params.id, {
      members: {
        include: {
          user: {
            include: {
              accounts: true
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
          userId: (member as any).userId
        }
      })
    }

    // Collect tracks from all players
    const playerTracks: Array<{
      playerId: string
      tracks: any[]
    }> = []

    for (const member of lobby.members) {
      const memberWithUser = member as any;
      const spotifyAccount = memberWithUser.user.accounts.find(
        (account: any) => account.provider === 'spotify'
      )

      if (spotifyAccount) {
        try {
          // Get valid access token (with automatic refresh if needed)
          const validToken = await getValidAccessToken(spotifyAccount, prisma)
          
          if (validToken) {
            // Get top 50 tracks from last 4 weeks
            const tracks = await getTopTracks(validToken, 50)
            
            playerTracks.push({
              playerId: memberWithUser.userId,
              tracks: tracks
            })
          } else {
            console.error(`Could not get valid token for user ${memberWithUser.userId}`)
          }
        } catch (error) {
          console.error(`Error fetching tracks for user ${memberWithUser.userId}:`, error)
        }
      } else {
        console.log(`No Spotify account found for user ${memberWithUser.userId}`)
      }
    }

    // Check if we have tracks from all players
    if (playerTracks.length !== lobby.members.length) {
      return NextResponse.json({ 
        error: 'Could not fetch tracks from all players. Please ensure all players have valid Spotify connections and try again.' 
      }, { status: 400 })
    }

    // Calculate fair distribution - each player gets proportional number of songs
    const totalRounds = lobby.roundCount
    const numberOfPlayers = playerTracks.length
    const songsPerPlayer = Math.floor(totalRounds / numberOfPlayers)
    const remainingSongs = totalRounds % numberOfPlayers

    console.log(`Fair distribution: ${songsPerPlayer} songs per player, ${remainingSongs} extra songs`)

    // Select tracks with fair distribution and no duplicates - NOW WITH TRUE RANDOMIZATION
    const selectedTracks: Array<{
      track: any
      ownerId: string
    }> = []
    const usedTrackIds = new Set<string>()

    // First, randomize tracks for each player before selection
    const randomizedPlayerTracks = playerTracks.map(playerData => ({
      ...playerData,
      tracks: shuffleArray(playerData.tracks) // Randomize the order for each player
    }))

    // First, give each player their fair share using random selection
    for (let i = 0; i < numberOfPlayers; i++) {
      const playerData = randomizedPlayerTracks[i]
      const playerSongCount = songsPerPlayer + (i < remainingSongs ? 1 : 0) // Distribute remaining songs to first players
      
      // Get available tracks (not already used)
      const availableTracks = playerData.tracks.filter(track => !usedTrackIds.has(track.id))
      
      // Select random tracks from available ones
      const selectedForPlayer = selectRandomTracks(availableTracks, playerSongCount)
      
      selectedForPlayer.forEach(track => {
        selectedTracks.push({
          track: track,
          ownerId: playerData.playerId
        })
        usedTrackIds.add(track.id)
      })
      
      console.log(`Player ${i + 1} got ${selectedForPlayer.length} songs out of ${playerSongCount} requested`)
    }

    // If we still don't have enough tracks (due to duplicates), try to fill from any player with random selection
    if (selectedTracks.length < totalRounds) {
      console.log(`Need ${totalRounds - selectedTracks.length} more tracks, trying to fill from any player`)
      
      // Collect all remaining available tracks from all players
      const allRemainingTracks: Array<{track: any, ownerId: string}> = []
      
      for (const playerData of randomizedPlayerTracks) {
        for (const track of playerData.tracks) {
          if (!usedTrackIds.has(track.id)) {
            allRemainingTracks.push({
              track: track,
              ownerId: playerData.playerId
            })
          }
        }
      }
      
      // Randomly select from remaining tracks
      const remainingNeeded = totalRounds - selectedTracks.length
      const randomRemainingTracks = selectRandomTracks(
        allRemainingTracks.map(item => item.track), 
        remainingNeeded
      )
      
      // Add the selected remaining tracks
      randomRemainingTracks.forEach(track => {
        const ownerData = allRemainingTracks.find(item => item.track.id === track.id)
        if (ownerData) {
          selectedTracks.push({
            track: track,
            ownerId: ownerData.ownerId
          })
          usedTrackIds.add(track.id)
        }
      })
    }

    // Shuffle the selected tracks for random order using Fisher-Yates algorithm
    const shuffledTracks = shuffleArray(selectedTracks)
    const gameTracks = shuffledTracks.slice(0, totalRounds)

    // Check if we have enough tracks
    if (gameTracks.length === 0) {
      return NextResponse.json({ 
        error: 'No tracks could be fetched from Spotify. Please ensure all players have valid Spotify connections and try again.' 
      }, { status: 400 })
    }

    if (gameTracks.length < totalRounds) {
      console.warn(`Only ${gameTracks.length} unique tracks found, but ${totalRounds} rounds requested`)
    }

    console.log(`Final track distribution:`)
    const distributionCount: Record<string, number> = {}
    gameTracks.forEach(({ ownerId }) => {
      distributionCount[ownerId] = (distributionCount[ownerId] || 0) + 1
    })
    console.log(distributionCount)

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

    // Update game status to PLAYING and start first round
    await prisma.game.update({
      where: { id: game.id },
      data: { 
        status: 'PLAYING',
        currentRound: 1
      }
    })

    // Get the first round to start it
    const firstRound = await prisma.round.findFirst({
      where: { 
        gameId: game.id,
        roundNumber: 1
      }
    })

    if (firstRound) {
      // Update first round with startedAt time
      await prisma.round.update({
        where: { id: firstRound.id },
        data: { startedAt: new Date() }
      })

      // Notify game that first round has started
      await pusherServer.trigger(`game-${game.id}`, 'round-started', {
        round: firstRound
      })
    }

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
