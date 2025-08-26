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
        // Get session with access token for the owner
        const sessionWithToken = await getServerSession(authOptions) as any
        
        if (!sessionWithToken?.accessToken) {
          return NextResponse.json({ 
            error: 'No Spotify access token found. Please sign out and sign in again.' 
          }, { status: 401 })
        }

        console.log('🎮 Starting game - collecting top tracks from owner (single player demo)')
        
        try {
          const spotifyService = new SpotifyService(sessionWithToken.accessToken)
          
          // For now, just use owner's tracks (single player demo)
          // TODO: Implement multi-player token collection system
          console.log('📝 Getting top tracks for owner:', session.user.email)
          const ownerTracks = await spotifyService.getTopTracks(session.user.email!, lobby.settings.tracksPerUser)
          
          if (ownerTracks.length === 0) {
            return NextResponse.json({ 
              error: 'No top tracks found. Make sure you have recent listening history on Spotify.' 
            }, { status: 400 })
          }

          // Add owner's name to tracks
          const tracksWithUserInfo = ownerTracks.map(track => ({
            ...track,
            user_name: session.user.name || 'Unknown User'
          }))

          console.log(`✅ Successfully collected ${tracksWithUserInfo.length} tracks from owner`)
          
          // For single player demo, duplicate some tracks to have enough for game
          let gameTrackPool = [...tracksWithUserInfo]
          if (gameTrackPool.length < lobby.settings.numberOfRounds) {
            // Duplicate tracks if we don't have enough
            while (gameTrackPool.length < lobby.settings.numberOfRounds) {
              gameTrackPool = [...gameTrackPool, ...tracksWithUserInfo]
            }
          }
          
          // Shuffle and take only what we need
          const shuffledTracks = gameTrackPool.sort(() => 0.5 - Math.random())
          const finalTracks = shuffledTracks.slice(0, lobby.settings.numberOfRounds)
          
          // Update lobby with tracks
          gameStore.updateLobby(lobbyId, { tracks: finalTracks })

          // Initialize player scores
          const playerIds = lobby.players.map(p => p.id)
          const playerNames = lobby.players.map(p => p.name)
          gameStore.initializeScores(lobbyId, playerIds, playerNames)

          gameStore.updateLobby(lobbyId, { 
            status: 'playing',
            currentRound: 1 
          })

          return NextResponse.json({ 
            message: 'Game started with owner\'s top tracks (single player demo)',
            trackCount: finalTracks.length,
            note: 'Currently using owner\'s tracks only. Multi-player support coming soon!'
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

      case 'submit-guess':
        const { guessedUserId, roundNumber } = data
        
        if (!guessedUserId || !roundNumber) {
          return NextResponse.json({ error: 'Invalid guess data' }, { status: 400 })
        }

        // Get current track
        const currentTrack = gameStore.getRandomTrack(lobbyId, roundNumber)
        if (!currentTrack) {
          return NextResponse.json({ error: 'No current track' }, { status: 400 })
        }

        // Calculate score
        const points = gameStore.calculateRoundScore(lobbyId, session.user.email!, guessedUserId, currentTrack.user_id)
        gameStore.updatePlayerScore(lobbyId, session.user.email!, points)

        // Create game round record
        const gameRound: GameRound = {
          roundNumber,
          track: currentTrack,
          correctAnswer: currentTrack.user_id,
          playerGuesses: { [session.user.email!]: guessedUserId },
          startTime: new Date(),
          endTime: new Date(),
        }
        gameStore.addGameRound(lobbyId, gameRound)

        return NextResponse.json({ 
          message: 'Guess submitted',
          correct: points > 0,
          correctAnswer: currentTrack.user_name
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
