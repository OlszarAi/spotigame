import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { SpotifyService } from '@/lib/spotify'
import GameStore from '@/lib/gameStore'
import { GameRound } from '@/types/game'

const gameStore = GameStore.getInstance()

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
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
      case 'load-playlist':
        // Get session with access token
        const sessionWithToken = await getServerSession() as any
        
        if (!sessionWithToken?.accessToken) {
          return NextResponse.json({ 
            error: 'No Spotify access token found. Please sign out and sign in again.' 
          }, { status: 401 })
        }

        console.log('Loading playlist:', lobby.settings.playlistUrl)
        console.log('Access token exists:', !!sessionWithToken.accessToken)
        
        const spotifyService = new SpotifyService(sessionWithToken.accessToken)
        
        try {
          // First check if it's a Blend playlist
          const isBlend = await spotifyService.isBlendPlaylist(lobby.settings.playlistUrl)
          console.log('Is Blend playlist:', isBlend)
          
          const tracks = await spotifyService.getPlaylistTracks(lobby.settings.playlistUrl)
          
          if (tracks.length === 0) {
            return NextResponse.json({ 
              error: 'No playable tracks found in playlist. Make sure the playlist has tracks with preview URLs and you have access to it.' 
            }, { status: 400 })
          }

          console.log('Successfully loaded', tracks.length, 'tracks')
          gameStore.updateLobby(lobbyId, { tracks })

          return NextResponse.json({ 
            message: 'Playlist loaded successfully',
            trackCount: tracks.length,
            isBlend: isBlend
          })
        } catch (error: any) {
          console.error('Spotify API Error:', error)
          return NextResponse.json({ 
            error: `Failed to load playlist: ${error.message}. Make sure you have access to this playlist and it's a public or collaborative playlist.` 
          }, { status: 400 })
        }

      case 'start':
        if (lobby.tracks.length === 0) {
          return NextResponse.json({ error: 'Please load a playlist first' }, { status: 400 })
        }

        // Initialize player scores
        const playerIds = lobby.players.map(p => p.id)
        const playerNames = lobby.players.map(p => p.name)
        gameStore.initializeScores(lobbyId, playerIds, playerNames)

        gameStore.updateLobby(lobbyId, { 
          status: 'playing',
          currentRound: 1 
        })

        return NextResponse.json({ message: 'Game started' })

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
        const points = gameStore.calculateRoundScore(lobbyId, session.user.email!, guessedUserId, currentTrack.added_by)
        gameStore.updatePlayerScore(lobbyId, session.user.email!, points)

        // Create game round record
        const gameRound: GameRound = {
          roundNumber,
          track: currentTrack,
          correctAnswer: currentTrack.added_by,
          playerGuesses: { [session.user.email!]: guessedUserId },
          startTime: new Date(),
          endTime: new Date(),
        }
        gameStore.addGameRound(lobbyId, gameRound)

        return NextResponse.json({ 
          message: 'Guess submitted',
          correct: points > 0,
          correctAnswer: currentTrack.added_by_name
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

        // Get playlist contributors for guessing options
        const contributors = gameStore.getPlaylistContributors(lobbyId)

        return NextResponse.json({
          track: {
            name: currentTrack.name,
            artist: currentTrack.artist,
            preview_url: currentTrack.preview_url,
          },
          options: contributors,
          correctAnswer: currentTrack.added_by,
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
