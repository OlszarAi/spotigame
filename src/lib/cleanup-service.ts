import { prisma } from '@/lib/prisma'

export class DatabaseCleanupService {
  private static instance: DatabaseCleanupService
  private cleanupInterval: NodeJS.Timeout | null = null

  static getInstance(): DatabaseCleanupService {
    if (!DatabaseCleanupService.instance) {
      DatabaseCleanupService.instance = new DatabaseCleanupService()
    }
    return DatabaseCleanupService.instance
  }

  startPeriodicCleanup(intervalMinutes: number = 60) {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performCleanup()
      } catch (error) {
        console.error('Scheduled cleanup failed:', error)
      }
    }, intervalMinutes * 60 * 1000)

    console.log(`Started periodic cleanup every ${intervalMinutes} minutes`)
  }

  stopPeriodicCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      console.log('Stopped periodic cleanup')
    }
  }

  async performCleanup() {
    console.log('Starting scheduled cleanup...')
    
    try {
      // Clean empty lobbies
      const emptyLobbies = await prisma.lobby.findMany({
        where: {
          members: { none: {} }
        },
        select: { id: true, name: true }
      })

      for (const lobby of emptyLobbies) {
        await this.cleanupLobby(lobby.id)
        console.log(`Cleaned empty lobby: ${lobby.name}`)
      }

      // Clean inactive lobbies (no activity for 2 hours)
      const inactiveLobbies = await prisma.lobby.findMany({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 2 * 60 * 60 * 1000)
          },
          games: {
            none: {
              status: { in: ['WAITING', 'LOADING', 'PLAYING'] }
            }
          }
        },
        select: { id: true, name: true }
      })

      for (const lobby of inactiveLobbies) {
        await this.cleanupLobby(lobby.id)
        console.log(`Cleaned inactive lobby: ${lobby.name}`)
      }

      // Clean old finished games (older than 3 days)
      const oldGames = await prisma.game.findMany({
        where: {
          status: 'FINISHED',
          updatedAt: {
            lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          }
        },
        select: { id: true }
      })

      for (const game of oldGames) {
        await this.cleanupGame(game.id)
        console.log(`Cleaned old game: ${game.id}`)
      }

      console.log(`Cleanup completed. Processed ${emptyLobbies.length + inactiveLobbies.length} lobbies and ${oldGames.length} games`)
    } catch (error) {
      console.error('Error during cleanup:', error)
      throw error
    }
  }

  private async cleanupLobby(lobbyId: string) {
    // Get all games for this lobby
    const games = await prisma.game.findMany({
      where: { lobbyId },
      include: {
        rounds: { select: { id: true } },
        participants: { select: { id: true } }
      }
    })

    // Clean each game
    for (const game of games) {
      await this.cleanupGame(game.id)
    }

    // Delete lobby members
    await prisma.lobbyMember.deleteMany({
      where: { lobbyId }
    })

    // Delete lobby
    await prisma.lobby.delete({
      where: { id: lobbyId }
    })
  }

  private async cleanupGame(gameId: string) {
    // Get all rounds for this game
    const rounds = await prisma.round.findMany({
      where: { gameId },
      select: { id: true }
    })

    // Delete votes for all rounds
    for (const round of rounds) {
      await prisma.vote.deleteMany({
        where: { roundId: round.id }
      })
    }

    // Delete rounds
    await prisma.round.deleteMany({
      where: { gameId }
    })

    // Delete game participants
    await prisma.gameParticipant.deleteMany({
      where: { gameId }
    })

    // Delete game
    await prisma.game.delete({
      where: { id: gameId }
    })
  }

  // Clean specific lobby by ID
  async cleanupSpecificLobby(lobbyId: string) {
    try {
      await this.cleanupLobby(lobbyId)
      console.log(`Successfully cleaned lobby: ${lobbyId}`)
    } catch (error) {
      console.error(`Failed to clean lobby ${lobbyId}:`, error)
      throw error
    }
  }

  // Get cleanup statistics
  async getCleanupStats() {
    const emptyLobbies = await prisma.lobby.count({
      where: { members: { none: {} } }
    })

    const inactiveLobbies = await prisma.lobby.count({
      where: {
        updatedAt: {
          lt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        games: {
          none: {
            status: { in: ['WAITING', 'LOADING', 'PLAYING'] }
          }
        }
      }
    })

    const oldGames = await prisma.game.count({
      where: {
        status: 'FINISHED',
        updatedAt: {
          lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      }
    })

    const totalLobbies = await prisma.lobby.count()
    const totalGames = await prisma.game.count()

    return {
      emptyLobbies,
      inactiveLobbies,
      oldGames,
      totalLobbies,
      totalGames,
      cleanupCandidates: emptyLobbies + inactiveLobbies + oldGames
    }
  }
}
