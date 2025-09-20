interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{
    name: string
    id: string
    images?: Array<{
      url: string
      height: number
      width: number
    }>
  }>
  external_urls: {
    spotify: string
  }
  uri: string
}

interface SpotifyArtist {
  id: string
  name: string
  images: Array<{
    url: string
    height: number
    width: number
  }>
  external_urls: {
    spotify: string
  }
  uri: string
  popularity: number
  genres: string[]
}

interface SpotifyTopTracksResponse {
  items: SpotifyTrack[]
}

interface SpotifyTopArtistsResponse {
  items: SpotifyArtist[]
}

interface TokenRefreshResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenRefreshResponse> {
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error refreshing token:', error)
    throw error
  }
}

export async function getValidAccessToken(account: { access_token: string; expires_at?: number; refresh_token?: string; id: string }, prisma: { account: { update: (params: { where: { id: string }; data: { access_token: string; expires_at?: number; refresh_token?: string } }) => Promise<unknown> } }): Promise<string | null> {
  try {
    // Check if token is still valid (expires_at is in seconds, Date.now() is in ms)
    const now = Math.floor(Date.now() / 1000)
    
    if (account.expires_at && account.expires_at > now + 300) { // 5 minutes buffer
      return account.access_token
    }

    // Token expired or will expire soon, refresh it
    if (!account.refresh_token) {
      console.error('No refresh token available for user:', account.id)
      return null
    }

    console.log('Refreshing Spotify token for user:', account.id)
    const refreshedTokens = await refreshAccessToken(account.refresh_token)
    
    // Update account with new tokens
    await prisma.account.update({
      where: { id: account.id },
      data: {
        access_token: refreshedTokens.access_token,
        expires_at: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
        refresh_token: refreshedTokens.refresh_token || account.refresh_token, // Keep old if not provided
      }
    })

    return refreshedTokens.access_token
  } catch (error) {
    console.error('Error getting valid access token:', error)
    return null
  }
}

export async function getTopTracks(accessToken: string, limit: number = 50, timeRange: string = 'short_term'): Promise<SpotifyTrack[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=${timeRange}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const data: SpotifyTopTracksResponse = await response.json()
    return data.items
  } catch (error) {
    console.error('Error fetching top tracks:', error)
    throw error
  }
}

export async function getTopArtists(accessToken: string, limit: number = 50, timeRange: string = 'short_term'): Promise<SpotifyArtist[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=${timeRange}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    const data: SpotifyTopArtistsResponse = await response.json()
    return data.items
  } catch (error) {
    console.error('Error fetching top artists:', error)
    throw error
  }
}

export async function getUserProfile(accessToken: string) {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching user profile:', error)
    throw error
  }
}

export function getSpotifyEmbedUrl(trackUri: string): string {
  const trackId = trackUri.split(':')[2]
  return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`
}

export function selectRandomTrack(tracks: SpotifyTrack[]): SpotifyTrack | null {
  if (tracks.length === 0) return null
  const randomIndex = Math.floor(Math.random() * tracks.length)
  return tracks[randomIndex]
}

// Fisher-Yates shuffle algorithm for true randomization
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array] // Create a copy
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Select random tracks from an array without replacement
export function selectRandomTracks(tracks: SpotifyTrack[], count: number): SpotifyTrack[] {
  if (tracks.length === 0) return []
  if (count >= tracks.length) return shuffleArray(tracks)
  
  const shuffled = shuffleArray(tracks)
  return shuffled.slice(0, count)
}

// Select random artists from an array without replacement
export function selectRandomArtists(artists: SpotifyArtist[], count: number): SpotifyArtist[] {
  if (artists.length === 0) return []
  if (count >= artists.length) return shuffleArray(artists)
  
  const shuffled = shuffleArray(artists)
  return shuffled.slice(0, count)
}

// Get the best quality image URL from Spotify artist images
export function getBestArtistImage(images: Array<{url: string, height: number, width: number}>): string | null {
  if (!images || images.length === 0) return null
  
  // Sort by height descending and return the largest image
  const sorted = images.sort((a, b) => (b.height || 0) - (a.height || 0))
  return sorted[0]?.url || null
}

// Convert TimeRange enum to Spotify API time_range parameter
export function timeRangeToSpotifyParam(timeRange: string): string {
  switch (timeRange) {
    case 'SHORT_TERM':
      return 'short_term'
    case 'MEDIUM_TERM':
      return 'medium_term'
    case 'LONG_TERM':
      return 'long_term'
    default:
      return 'short_term'
  }
}
