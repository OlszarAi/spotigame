import { NextApiRequest, NextApiResponse } from 'next'
import { Server as NetServer, Socket } from 'net'
import { Server as HttpServer } from 'http'
import { Server as ServerIO } from 'socket.io'
import GameStore from '@/lib/gameStore'

const gameStore = GameStore.getInstance()

export const config = {
  api: {
    bodyParser: false,
  },
}

interface NextApiResponseServerIO extends NextApiResponse {
  socket: Socket & {
    server: HttpServer & {
      io?: ServerIO
    }
  }
}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
  } else {
    console.log('Socket is initializing')
    const io = new ServerIO(res.socket.server, {
      path: '/api/socketio',
      cors: {
        origin: '*',
      },
    })
    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('User connected:', socket.id)

      // Join lobby room
      socket.on('join-lobby', (lobbyId: string) => {
        socket.join(lobbyId)
        console.log(`User ${socket.id} joined lobby ${lobbyId}`)
        
        // Broadcast updated player list to all clients in the lobby
        const lobby = gameStore.getLobby(lobbyId)
        if (lobby) {
          io.to(lobbyId).emit('lobby-updated', lobby)
        }
      })

      // Leave lobby room
      socket.on('leave-lobby', (lobbyId: string) => {
        socket.leave(lobbyId)
        console.log(`User ${socket.id} left lobby ${lobbyId}`)
      })

      // Handle game events
      socket.on('game-start', (lobbyId: string) => {
        io.to(lobbyId).emit('game-started')
      })

      socket.on('round-start', (data: { lobbyId: string; trackData: any }) => {
        io.to(data.lobbyId).emit('round-started', data.trackData)
      })

      socket.on('round-end', (data: { lobbyId: string; results: any }) => {
        io.to(data.lobbyId).emit('round-ended', data.results)
      })

      socket.on('game-end', (data: { lobbyId: string; finalScores: any }) => {
        io.to(data.lobbyId).emit('game-ended', data.finalScores)
      })

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id)
      })
    })
  }
  res.end()
}

export default SocketHandler
