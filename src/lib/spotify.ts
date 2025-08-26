import SpotifyWebApi from 'spotify-web-api-node'
import { Track } from '@/types'

export class SpotifyService {
  private spotifyApi: SpotifyWebApi

  constructor(accessToken: string) {
    this.spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    })
    this.spotifyApi.setAccessToken(accessToken)
  }

  async getTopTracks(userId: string, userName: string): Promise<Track[]> {
    try {
      const response = await this.spotifyApi.getMyTopTracks({
        time_range: 'short_term',
        limit: 100,
      })

      const tracks: Track[] = response.body.items
        .filter(item => item.preview_url) // Only include tracks with preview URLs
        .map(item => ({
          id: item.id,
          title: item.name,
          artist: item.artists.map(artist => artist.name).join(', '),
          previewUrl: item.preview_url!,
          ownerUserId: userId,
          ownerUserName: userName,
        }))

      return tracks
    } catch (error) {
      console.error('Error fetching top tracks:', error)
      throw new Error('Failed to fetch top tracks from Spotify')
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.spotifyApi.getMe()
      return response.body
    } catch (error) {
      console.error('Error fetching current user:', error)
      throw new Error('Failed to fetch user from Spotify')
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      this.spotifyApi.setRefreshToken(refreshToken)
      const response = await this.spotifyApi.refreshAccessToken()
      return response.body.access_token
    } catch (error) {
      console.error('Error refreshing access token:', error)
      throw new Error('Failed to refresh access token')
    }
  }
}

export const createSpotifyService = (accessToken: string) => {
  return new SpotifyService(accessToken)
}
