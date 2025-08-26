import SpotifyWebApi from 'spotify-web-api-node'
import { Track } from '@/types/game'

export class SpotifyService {
  private spotifyApi: SpotifyWebApi

  constructor(accessToken: string) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    })
    this.spotifyApi.setAccessToken(accessToken)
  }

  async getTopTracks(userId: string, limit: number = 50): Promise<Track[]> {
    try {
      console.log(`🎵 Fetching top tracks for user: ${userId}`)
      
      const response = await this.spotifyApi.getMyTopTracks({
        time_range: 'short_term', // last 4 weeks
        limit: limit
      })
      
      const tracks: Track[] = []
      
      for (const track of response.body.items) {
        if (track.preview_url) {
          tracks.push({
            id: track.id,
            name: track.name,
            artist: track.artists[0]?.name || 'Unknown Artist',
            preview_url: track.preview_url,
            user_id: userId,
            user_name: '', // Will be filled later with user data
          })
        }
      }

      console.log(`✅ Found ${tracks.length} top tracks with preview URLs for user ${userId}`)
      
      if (tracks.length === 0) {
        throw new Error('No playable top tracks found with preview URLs')
      }

      return tracks
    } catch (error: any) {
      console.error('❌ Error fetching top tracks:', error)
      
      if (error.statusCode === 401) {
        throw new Error('Spotify authentication expired. Please sign out and sign in again.')
      } else if (error.statusCode === 403) {
        throw new Error('Access forbidden. Make sure you have granted permission to read your top tracks.')
      } else {
        throw new Error(`Spotify API error: ${error.message || 'Unknown error'}`)
      }
    }
  }

  async getUserProfile(): Promise<any> {
    try {
      const user = await this.spotifyApi.getMe()
      return user.body
    } catch (error) {
      console.error('Error fetching user profile:', error)
      throw new Error('Failed to fetch user profile')
    }
  }

  // Helper method to create game tracks pool from multiple users' top tracks
  async createGameTracksPool(userTokens: Array<{userId: string, userName: string, accessToken: string}>, tracksPerUser: number = 10): Promise<Track[]> {
    const allTracks: Track[] = []
    
    for (const user of userTokens) {
      try {
        // Create new service instance for each user
        const userSpotifyService = new SpotifyService(user.accessToken)
        const userTopTracks = await userSpotifyService.getTopTracks(user.userId, 50)
        
        // Add user name to tracks
        const tracksWithUserInfo = userTopTracks.map(track => ({
          ...track,
          user_name: user.userName
        }))
        
        // Randomly select tracks for this user
        const shuffled = tracksWithUserInfo.sort(() => 0.5 - Math.random())
        const selectedTracks = shuffled.slice(0, Math.min(tracksPerUser, shuffled.length))
        
        allTracks.push(...selectedTracks)
        console.log(`✅ Added ${selectedTracks.length} tracks from ${user.userName}`)
      } catch (error) {
        console.error(`❌ Failed to get tracks for user ${user.userName}:`, error)
        // Continue with other users even if one fails
      }
    }
    
    if (allTracks.length === 0) {
      throw new Error('No tracks could be gathered from any user')
    }
    
    // Shuffle the final pool
    const shuffledPool = allTracks.sort(() => 0.5 - Math.random())
    console.log(`🎮 Created game pool with ${shuffledPool.length} tracks from ${userTokens.length} users`)
    
    return shuffledPool
  }
}
