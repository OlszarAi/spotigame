import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { SpotifyService } from '@/lib/spotify'
import GameStore from '@/lib/gameStore'
import { GameRound } from '@/types/game'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

const gameStore = GameStore.getInstance()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lobbyId, action, data } = await request.json()

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID required' }, { status: 400 })
    }

    const lobby = gameStore.getLobby(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    // Only lobby owner can start the game
    if (action === 'start' && lobby.ownerId !== session.user.email) {
      return NextResponse.json({ error: 'Only lobby owner can start the game' }, { status: 403 })
    }

    switch (action) {
      case 'start':
        console.log('🎮 Starting multiplayer game - collecting top tracks from all players')
        
        // Check if all players have authorized
        const playersWithTokens = gameStore.getPlayersWithTokens(lobbyId)
        const allPlayerIds = lobby.players.map(p => p.id)
        
        if (playersWithTokens.length !== allPlayerIds.length) {
          const missingPlayers = allPlayerIds.filter(id => !playersWithTokens.includes(id))
          return NextResponse.json({ 
            error: 'Not all players have authorized Spotify access',
            missingPlayers: missingPlayers,
            message: 'All players must authorize before starting the game'
          }, { status: 400 })
        }

        try {
          const allTokens = gameStore.getAllPlayerTokens(lobbyId)
          const userTokens = allTokens.map(token => {
            const player = lobby.players.find(p => p.id === token.userId)
            return {
              userId: token.userId,
              userName: player?.name || 'Unknown Player',
              accessToken: token.accessToken
            }
          })

          console.log(`🎵 Collecting top tracks from ${userTokens.length} players`)
          
          // Use the updated SpotifyService method
          const sessionWithToken = await getServerSession(authOptions) as any
          const spotifyService = new SpotifyService(sessionWithToken.accessToken)
          const tracks = await spotifyService.createGameTracksPool(userTokens, lobby.settings.tracksPerUser)
          
          if (tracks.length === 0) {
            return NextResponse.json({ 
              error: 'No top tracks found from any player. Make sure players have recent listening history.' 
            }, { status: 400 })
          }

          console.log(`✅ Successfully collected ${tracks.length} tracks from ${userTokens.length} players`)
          
          // Update lobby with tracks
          gameStore.updateLobby(lobbyId, { tracks })

          // Initialize player scores
          const playerIds = lobby.players.map(p => p.id)
          const playerNames = lobby.players.map(p => p.name)
          gameStore.initializeScores(lobbyId, playerIds, playerNames)

          gameStore.updateLobby(lobbyId, { 
            status: 'playing',
            currentRound: 1 
          })

          return NextResponse.json({ 
            message: 'Multiplayer game started successfully!',
            trackCount: tracks.length,
            playersCount: userTokens.length
          })
        } catch (error: any) {
          console.error('Error collecting top tracks:', error)
          return NextResponse.json({ 
            error: `Failed to start game: ${error.message}` 
          }, { status: 400 })
        }

      case 'next-round':
        const updatedLobby = gameStore.getLobby(lobbyId)
        if (!updatedLobby) {
          return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
        }

        if (updatedLobby.currentRound >= updatedLobby.settings.numberOfRounds) {
          gameStore.updateLobby(lobbyId, { status: 'finished' })
        } else {
          gameStore.updateLobby(lobbyId, { currentRound: updatedLobby.currentRound + 1 })
        }

        const finalLobby = gameStore.getLobby(lobbyId)
        return NextResponse.json({ 
          currentRound: finalLobby?.currentRound,
          isFinished: finalLobby?.status === 'finished'
        })

      case 'guess':
        const { guess } = data
        
        if (!guess) {
          return NextResponse.json({ error: 'Invalid guess data' }, { status: 400 })
        }

        // Get current track for current round
        const currentTrack = gameStore.getRandomTrack(lobbyId, lobby.currentRound)
        if (!currentTrack) {
          return NextResponse.json({ error: 'No current track' }, { status: 400 })
        }

        // Calculate score
        const points = gameStore.calculateRoundScore(lobbyId, session.user.email!, guess, currentTrack.user_id)
        gameStore.updatePlayerScore(lobbyId, session.user.email!, points)

        // Create game round record
        const gameRound: GameRound = {
          roundNumber: lobby.currentRound,
          track: currentTrack,
          correctAnswer: currentTrack.user_id,
          playerGuesses: { [session.user.email!]: guess },
          startTime: new Date(),
          endTime: new Date(),
        }
        gameStore.addGameRound(lobbyId, gameRound)

        // Get updated scores to return
        const updatedScores = gameStore.getPlayerScores(lobbyId)

        return NextResponse.json({ 
          message: 'Guess submitted',
          correct: points > 0,
          correctAnswer: currentTrack.user_name,
          scores: updatedScores,
          points
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in game API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const lobbyId = searchParams.get('lobbyId')
    const action = searchParams.get('action')

    if (!lobbyId) {
      return NextResponse.json({ error: 'Lobby ID required' }, { status: 400 })
    }

    const lobby = gameStore.getLobby(lobbyId)
    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    switch (action) {
      case 'currentTrack':
      case 'current-track':
        if (lobby.status !== 'playing' || lobby.tracks.length === 0) {
          return NextResponse.json({ error: 'Game not active' }, { status: 400 })
        }

        // Get track for current round
        const currentTrack = gameStore.getRandomTrack(lobbyId, lobby.currentRound)
        if (!currentTrack) {
          return NextResponse.json({ error: 'No track available' }, { status: 400 })
        }

        // Get playlist contributors for guessing options (now track owners)
        const contributors = gameStore.getTrackOwners(lobbyId)

        return NextResponse.json({
          track: {
            name: currentTrack.name,
            artist: currentTrack.artist,
            preview_url: currentTrack.preview_url,
          },
          options: contributors,
          correctAnswer: currentTrack.user_id,
          roundNumber: lobby.currentRound,
          totalRounds: lobby.settings.numberOfRounds,
        })

      case 'leaderboard':
        const playerScores = gameStore.getPlayerScores(lobbyId)
        return NextResponse.json({ scores: playerScores })

      default:
        return NextResponse.json({ lobby })
    }
  } catch (error) {
    console.error('Error fetching game data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
