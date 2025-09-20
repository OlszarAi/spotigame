import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('Starting lobby cleanup...')
    
    // Find inactive lobbies older than 1 hour or lobbies with 0 members
    const inactiveLobbies = await prisma.lobby.findMany({
      where: {
        OR: [
          {
            isActive: false,
            updatedAt: {
              lt: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
            }
          },
          {
            // Lobbies with no members
            members: {
              none: {}
            }
          },
          {
            // Lobbies older than 24 hours with no activity
            updatedAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
            },
            games: {
              none: {
                status: {
                  in: ['WAITING', 'LOADING', 'PLAYING']
                }
              }
            }
          }
        ]
      },
      include: {
        members: true,
        games: {
          include: {
            rounds: true,
            participants: true
          }
        }
      }
    })

    console.log(`Found ${inactiveLobbies.length} lobbies to cleanup`)

    let cleanedCount = 0
    
    for (const lobby of inactiveLobbies) {
      try {
        // Delete in correct order to handle foreign key constraints
        for (const game of lobby.games) {
          // Delete votes for each round
          for (const round of game.rounds) {
            await prisma.vote.deleteMany({
              where: { roundId: round.id }
            })
          }
          
          // Delete rounds
          await prisma.round.deleteMany({
            where: { gameId: game.id }
          })
          
          // Delete game participants
          await prisma.gameParticipant.deleteMany({
            where: { gameId: game.id }
          })
          
          // Delete game
          await prisma.game.delete({
            where: { id: game.id }
          })
        }
        
        // Delete lobby members
        await prisma.lobbyMember.deleteMany({
          where: { lobbyId: lobby.id }
        })
        
        // Delete lobby
        await prisma.lobby.delete({
          where: { id: lobby.id }
        })
        
        cleanedCount++
        console.log(`Cleaned lobby: ${lobby.name} (${lobby.id})`)
      } catch (error) {
        console.error(`Error cleaning lobby ${lobby.id}:`, error)
      }
    }

    // Also clean old finished games (older than 7 days)
    const oldGames = await prisma.game.findMany({
      where: {
        status: 'FINISHED',
        updatedAt: {
          lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
        }
      },
      include: {
        rounds: true,
        participants: true
      }
    })

    console.log(`Found ${oldGames.length} old finished games to cleanup`)

    for (const game of oldGames) {
      try {
        // Delete votes for each round
        for (const round of game.rounds) {
          await prisma.vote.deleteMany({
            where: { roundId: round.id }
          })
        }
        
        // Delete rounds
        await prisma.round.deleteMany({
          where: { gameId: game.id }
        })
        
        // Delete game participants
        await prisma.gameParticipant.deleteMany({
          where: { gameId: game.id }
        })
        
        // Delete game
        await prisma.game.delete({
          where: { id: game.id }
        })
        
        console.log(`Cleaned old game: ${game.id}`)
      } catch (error) {
        console.error(`Error cleaning game ${game.id}:`, error)
      }
    }

    console.log(`Cleanup completed. Cleaned ${cleanedCount} lobbies and ${oldGames.length} old games.`)

    return NextResponse.json({ 
      success: true, 
      cleaned: {
        lobbies: cleanedCount,
        games: oldGames.length
      }
    })
  } catch (error) {
    console.error('Error during cleanup:', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}

// Auto-cleanup endpoint for cron jobs
export async function GET(req: NextRequest) {
  // Verify it's a cron job or internal call
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  return POST()
}
