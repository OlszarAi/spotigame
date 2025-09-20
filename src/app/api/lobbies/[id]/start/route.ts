import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'
import { getTopTracks, getTopArtists, selectRandomTracks, selectRandomArtists, shuffleArray, getValidAccessToken, getBestArtistImage, timeRangeToSpotifyParam } from '@/lib/spotify'
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
      where: { email: (session as any).user.email }
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

    // Check if all members are ready and count them
    const members = await prisma.lobbyMember.findMany({
      where: { lobbyId: lobby.id }
    })
    
    const allReady = members.every(member => member.isReady)
    if (!allReady) {
      return NextResponse.json({ error: 'All players must be ready' }, { status: 400 })
    }

    if (members.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 players' }, { status: 400 })
    }

    // Notify lobby that game is starting
    await pusherServer.trigger(`lobby-${params.id}`, 'game-starting', {})

    // Create game
    const game = await prisma.game.create({
      data: {
        lobbyId: lobby.id,
        totalRounds: lobby.roundCount,
        gameMode: lobby.gameMode,
        timeRange: lobby.timeRange,
        status: 'LOADING'
      }
    })

    // Add participants
    for (const member of members) {
      await prisma.gameParticipant.create({
        data: {
          gameId: game.id,
          userId: member.userId
        }
      })
    }

    // Collect data from all players (tracks or artists based on game mode)
    const playerData: Array<{
      playerId: string
      tracks?: any[]
      artists?: any[]
    }> = []

    // Get members with their user accounts
    const membersWithAccounts = await prisma.lobbyMember.findMany({
      where: { lobbyId: lobby.id },
      include: {
        user: {
          include: {
            accounts: true
          }
        }
      }
    })
    
    for (const member of membersWithAccounts) {
      const spotifyAccount = member.user.accounts.find(
        (account: any) => account.provider === 'spotify'
      )

      if (spotifyAccount && spotifyAccount.access_token) {
        try {
          // Get valid access token (with automatic refresh if needed)
          const validToken = await getValidAccessToken(spotifyAccount as any, prisma)
          
          if (validToken) {
            const spotifyTimeRange = timeRangeToSpotifyParam(lobby.timeRange)
            
            if (lobby.gameMode === 'ARTISTS') {
              // Get top 50 artists based on selected time range
              const artists = await getTopArtists(validToken, 50, spotifyTimeRange)
              
              playerData.push({
                playerId: member.userId,
                artists: artists
              })
            } else {
              // Get top 50 tracks based on selected time range
              const tracks = await getTopTracks(validToken, 50, spotifyTimeRange)
              
              playerData.push({
                playerId: member.userId,
                tracks: tracks
              })
            }
          } else {
            console.error(`Could not get valid token for user ${member.userId}`)
          }
        } catch (error) {
          console.error(`Error fetching ${lobby.gameMode === 'ARTISTS' ? 'artists' : 'tracks'} for user ${member.userId}:`, error)
        }
      } else {
        console.log(`No Spotify account found for user ${member.userId}`)
      }
    }

    // Check if we have data from all players
    if (playerData.length !== members.length) {
      return NextResponse.json({ 
        error: `Could not fetch ${lobby.gameMode === 'ARTISTS' ? 'artists' : 'tracks'} from all players. Please ensure all players have valid Spotify connections and try again.` 
      }, { status: 400 })
    }

    // Calculate fair distribution - each player gets proportional number of items
    const totalRounds = lobby.roundCount
    const numberOfPlayers = playerData.length
    const itemsPerPlayer = Math.floor(totalRounds / numberOfPlayers)
    const remainingItems = totalRounds % numberOfPlayers

    console.log(`Fair distribution: ${itemsPerPlayer} ${lobby.gameMode === 'ARTISTS' ? 'artists' : 'tracks'} per player, ${remainingItems} extra items, mode: ${lobby.gameMode}`)

    // Select items with fair distribution and no duplicates - NOW WITH TRUE RANDOMIZATION
    const selectedItems: Array<{
      item: any
      ownerId: string
    }> = []
    const usedItemIds = new Set<string>()

    // First, randomize items for each player before selection
    const randomizedPlayerData = playerData.map(playerInfo => {
      if (lobby.gameMode === 'ARTISTS' && playerInfo.artists) {
        return {
          ...playerInfo,
          artists: shuffleArray(playerInfo.artists) // Randomize the order for each player
        }
      } else if (lobby.gameMode === 'SONGS' && playerInfo.tracks) {
        return {
          ...playerInfo,
          tracks: shuffleArray(playerInfo.tracks) // Randomize the order for each player
        }
      }
      return playerInfo
    })

    // First, give each player their fair share using random selection
    for (let i = 0; i < numberOfPlayers; i++) {
      const playerInfo = randomizedPlayerData[i]
      const playerItemCount = itemsPerPlayer + (i < remainingItems ? 1 : 0) // Distribute remaining items to first players
      
      if (lobby.gameMode === 'ARTISTS' && playerInfo.artists) {
        // Get available artists (not already used)
        const availableArtists = playerInfo.artists.filter(artist => !usedItemIds.has(artist.id))
        
        // Select random artists from available ones
        const selectedForPlayer = selectRandomArtists(availableArtists, playerItemCount)
        
        selectedForPlayer.forEach(artist => {
          selectedItems.push({
            item: artist,
            ownerId: playerInfo.playerId
          })
          usedItemIds.add(artist.id)
        })
        
        console.log(`Player ${i + 1} got ${selectedForPlayer.length} artists out of ${playerItemCount} requested`)
      } else if (lobby.gameMode === 'SONGS' && playerInfo.tracks) {
        // Get available tracks (not already used)
        const availableTracks = playerInfo.tracks.filter(track => !usedItemIds.has(track.id))
        
        // Select random tracks from available ones
        const selectedForPlayer = selectRandomTracks(availableTracks, playerItemCount)
        
        selectedForPlayer.forEach(track => {
          selectedItems.push({
            item: track,
            ownerId: playerInfo.playerId
          })
          usedItemIds.add(track.id)
        })
        
        console.log(`Player ${i + 1} got ${selectedForPlayer.length} tracks out of ${playerItemCount} requested`)
      }
    }

    // If we still don't have enough items (due to duplicates), try to fill from any player with random selection
    if (selectedItems.length < totalRounds) {
      console.log(`Need ${totalRounds - selectedItems.length} more ${lobby.gameMode === 'ARTISTS' ? 'artists' : 'tracks'}, trying to fill from any player`)
      
      // Collect all remaining available items from all players
      const allRemainingItems: Array<{item: any, ownerId: string}> = []
      
      for (const playerInfo of randomizedPlayerData) {
        if (lobby.gameMode === 'ARTISTS' && playerInfo.artists) {
          for (const artist of playerInfo.artists) {
            if (!usedItemIds.has(artist.id)) {
              allRemainingItems.push({
                item: artist,
                ownerId: playerInfo.playerId
              })
            }
          }
        } else if (lobby.gameMode === 'SONGS' && playerInfo.tracks) {
          for (const track of playerInfo.tracks) {
            if (!usedItemIds.has(track.id)) {
              allRemainingItems.push({
                item: track,
                ownerId: playerInfo.playerId
              })
            }
          }
        }
      }
      
      // Randomly select from remaining items
      const remainingNeeded = totalRounds - selectedItems.length
      let randomRemainingItems: any[] = []
      
      if (lobby.gameMode === 'ARTISTS') {
        randomRemainingItems = selectRandomArtists(
          allRemainingItems.map(item => item.item), 
          remainingNeeded
        )
      } else {
        randomRemainingItems = selectRandomTracks(
          allRemainingItems.map(item => item.item), 
          remainingNeeded
        )
      }
      
      // Add the selected remaining items
      randomRemainingItems.forEach(item => {
        const ownerData = allRemainingItems.find(entry => entry.item.id === item.id)
        if (ownerData) {
          selectedItems.push({
            item: item,
            ownerId: ownerData.ownerId
          })
          usedItemIds.add(item.id)
        }
      })
    }

    // Shuffle the selected items for random order using Fisher-Yates algorithm
    const shuffledItems = shuffleArray(selectedItems)
    const gameItems = shuffledItems.slice(0, totalRounds)

    // Check if we have enough items
    if (gameItems.length === 0) {
      return NextResponse.json({ 
        error: `No ${lobby.gameMode === 'ARTISTS' ? 'artists' : 'tracks'} could be fetched from Spotify. Please ensure all players have valid Spotify connections and try again.` 
      }, { status: 400 })
    }

    if (gameItems.length < totalRounds) {
      console.warn(`Only ${gameItems.length} unique ${lobby.gameMode === 'ARTISTS' ? 'artists' : 'tracks'} found, but ${totalRounds} rounds requested`)
    }

    console.log(`Final ${lobby.gameMode === 'ARTISTS' ? 'artist' : 'track'} distribution:`)
    const distributionCount: Record<string, number> = {}
    gameItems.forEach(({ ownerId }) => {
      distributionCount[ownerId] = (distributionCount[ownerId] || 0) + 1
    })
    console.log(distributionCount)

    // Create rounds
    for (let i = 0; i < gameItems.length; i++) {
      const { item, ownerId } = gameItems[i]
      
      if (lobby.gameMode === 'ARTISTS') {
        await prisma.round.create({
          data: {
            gameId: game.id,
            roundNumber: i + 1,
            artistId: item.id,
            artistName: item.name,
            artistImage: getBestArtistImage(item.images),
            ownerId: ownerId,
            timeLimit: 30
          }
        })
      } else {
        await prisma.round.create({
          data: {
            gameId: game.id,
            roundNumber: i + 1,
            trackId: item.id,
            trackName: item.name,
            trackArtist: item.artists.map((a: any) => a.name).join(', '),
            trackUri: item.uri,
            ownerId: ownerId,
            timeLimit: 30
          }
        })
      }
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
