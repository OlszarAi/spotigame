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

  async getPlaylistFromUrl(playlistUrl: string): Promise<any> {
    // Extract playlist ID from Spotify URL
    const playlistId = this.extractPlaylistId(playlistUrl)
    if (!playlistId) {
      throw new Error('Invalid Spotify playlist URL')
    }

    try {
      const playlist = await this.spotifyApi.getPlaylist(playlistId)
      return playlist.body
    } catch (error) {
      console.error('Error fetching playlist:', error)
      throw new Error('Failed to fetch playlist')
    }
  }

  async getPlaylistTracks(playlistUrl: string): Promise<Track[]> {
    const playlist = await this.getPlaylistFromUrl(playlistUrl)
    const tracks: Track[] = []

    for (const item of playlist.tracks.items) {
      if (item.track && item.track.preview_url) {
        tracks.push({
          id: item.track.id,
          name: item.track.name,
          artist: item.track.artists[0]?.name || 'Unknown Artist',
          preview_url: item.track.preview_url,
          added_by: item.added_by.id,
          added_by_name: item.added_by.display_name || item.added_by.id,
        })
      }
    }

    return tracks
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

  private extractPlaylistId(url: string): string | null {
    // Handle different Spotify URL formats
    const patterns = [
      /spotify:playlist:([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  // Check if a playlist is a Blend playlist
  async isBlendPlaylist(playlistUrl: string): Promise<boolean> {
    try {
      const playlist = await this.getPlaylistFromUrl(playlistUrl)
      // Blend playlists typically have multiple contributors
      // and specific naming patterns
      return playlist.collaborative || 
             playlist.name.toLowerCase().includes('blend') ||
             playlist.description?.toLowerCase().includes('blend')
    } catch (error) {
      return false
    }
  }
}
