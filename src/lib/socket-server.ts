import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { lobbyManager } from './lobby-manager'
import { createSpotifyService } from './spotify'
import { SocketEvents } from '@/types'

export class GameSocketServer {
  private io: SocketIOServer
  private connectedUsers: Map<string, string> = new Map() // socketId -> userId
  private userSockets: Map<string, string> = new Map() // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      socket.on('join-lobby', async ({ lobbyId, userId }) => {
        try {
          // Store user connection
          this.connectedUsers.set(socket.id, userId)
          this.userSockets.set(userId, socket.id)

          // Join socket room
          socket.join(lobbyId)

          // Get updated lobby
          const lobby = lobbyManager.getLobby(lobbyId)
          if (lobby) {
            // Emit to all users in the lobby
            this.io.to(lobbyId).emit('lobby-updated', lobby)
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to join lobby' })
        }
      })

      socket.on('leave-lobby', ({ lobbyId, userId }) => {
        try {
          socket.leave(lobbyId)
          
          const updatedLobby = lobbyManager.leaveLobby(lobbyId, userId)
          if (updatedLobby) {
            this.io.to(lobbyId).emit('lobby-updated', updatedLobby)
          }

          // Clean up user connections
          this.connectedUsers.delete(socket.id)
          this.userSockets.delete(userId)
        } catch (error) {
          socket.emit('error', { message: 'Failed to leave lobby' })
        }
      })

      socket.on('update-lobby-settings', ({ lobbyId, settings }) => {
        try {
          const userId = this.connectedUsers.get(socket.id)
          if (!userId) return

          const updatedLobby = lobbyManager.updateLobbySettings(lobbyId, userId, settings)
          if (updatedLobby) {
            this.io.to(lobbyId).emit('lobby-updated', updatedLobby)
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to update lobby settings' })
        }
      })

      socket.on('start-game', async ({ lobbyId }) => {
        try {
          const userId = this.connectedUsers.get(socket.id)
          if (!userId) return

          const lobby = lobbyManager.startGame(lobbyId, userId)
          if (lobby) {
            this.io.to(lobbyId).emit('game-started', { lobbyId })
            this.io.to(lobbyId).emit('lobby-updated', lobby)
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to start game' })
        }
      })

      socket.on('submit-guess', ({ lobbyId, guessedUserId }) => {
        try {
          const userId = this.connectedUsers.get(socket.id)
          if (!userId) return

          lobbyManager.submitGuess(lobbyId, userId, guessedUserId)
          
          // Check if all players have submitted their guesses
          this.checkAndProcessRound(lobbyId)
        } catch (error) {
          socket.emit('error', { message: 'Failed to submit guess' })
        }
      })

      socket.on('ready-for-next-round', ({ lobbyId }) => {
        try {
          // Start next round or finish game
          this.startNextRound(lobbyId)
        } catch (error) {
          socket.emit('error', { message: 'Failed to start next round' })
        }
      })

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
        
        const userId = this.connectedUsers.get(socket.id)
        if (userId) {
          this.connectedUsers.delete(socket.id)
          this.userSockets.delete(userId)
        }
      })
    })
  }

  private checkAndProcessRound(lobbyId: string) {
    const lobby = lobbyManager.getLobby(lobbyId)
    if (!lobby || !lobby.gameState) return

    // Check if all players have submitted guesses
    const playerIds = lobby.players.map(p => p.id)
    const guessedPlayerIds = Object.keys(lobby.gameState.playerGuesses)
    
    if (playerIds.every(id => guessedPlayerIds.includes(id))) {
      // All players have guessed, process round
      const results = lobbyManager.processRoundResults(lobbyId)
      if (results) {
        this.io.to(lobbyId).emit('round-ended', { 
          results,
          nextRoundStartTime: lobbyManager.isGameFinished(lobbyId) ? undefined : new Date(Date.now() + 5000)
        })

        // Check if game is finished
        if (lobbyManager.isGameFinished(lobbyId)) {
          const finalResults = lobbyManager.getFinalResults(lobbyId)
          setTimeout(() => {
            this.io.to(lobbyId).emit('game-finished', { finalResults })
          }, 3000)
        } else {
          // Start next round after 5 seconds
          setTimeout(() => {
            this.startNextRound(lobbyId)
          }, 5000)
        }
      }
    }
  }

  private startNextRound(lobbyId: string) {
    const lobby = lobbyManager.getLobby(lobbyId)
    if (!lobby || !lobby.gameState) return

    if (lobbyManager.isGameFinished(lobbyId)) {
      const finalResults = lobbyManager.getFinalResults(lobbyId)
      this.io.to(lobbyId).emit('game-finished', { finalResults })
      return
    }

    // Get random track for next round
    const usedTrackIds: string[] = [] // In a real implementation, you'd track used tracks
    const randomTrack = lobbyManager.getRandomTrack(lobbyId, usedTrackIds)
    
    if (randomTrack) {
      lobbyManager.nextRound(lobbyId)
      
      const updatedLobby = lobbyManager.getLobby(lobbyId)
      if (updatedLobby && updatedLobby.gameState) {
        updatedLobby.gameState.currentTrack = randomTrack
        updatedLobby.gameState.roundStartTime = new Date()
        updatedLobby.gameState.roundEndTime = new Date(Date.now() + lobby.settings.listeningDuration * 1000)
        
        this.io.to(lobbyId).emit('round-started', {
          track: randomTrack,
          roundEndTime: updatedLobby.gameState.roundEndTime
        })
      }
    }
  }

  // Method to start the first round when all players are ready
  public startFirstRound(lobbyId: string) {
    const lobby = lobbyManager.getLobby(lobbyId)
    if (!lobby || lobby.status !== 'playing') return

    const randomTrack = lobbyManager.getRandomTrack(lobbyId)
    if (randomTrack && lobby.gameState) {
      lobby.gameState.currentTrack = randomTrack
      lobby.gameState.roundStartTime = new Date()
      lobby.gameState.roundEndTime = new Date(Date.now() + lobby.settings.listeningDuration * 1000)
      
      this.io.to(lobbyId).emit('round-started', {
        track: randomTrack,
        roundEndTime: lobby.gameState.roundEndTime
      })
    }
  }
}

let gameSocketServer: GameSocketServer | null = null

export const initializeSocketServer = (server: HTTPServer): GameSocketServer => {
  if (!gameSocketServer) {
    gameSocketServer = new GameSocketServer(server)
  }
  return gameSocketServer
}

export const getSocketServer = (): GameSocketServer | null => {
  return gameSocketServer
}
