interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{
    name: string
  }>
  external_urls: {
    spotify: string
  }
  uri: string
}

interface SpotifyTopTracksResponse {
  items: SpotifyTrack[]
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

export async function getValidAccessToken(account: any, prisma: any): Promise<string | null> {
  try {
    // Check if token is still valid (expires_at is in seconds, Date.now() is in ms)
    const now = Math.floor(Date.now() / 1000)
    
    if (account.expires_at && account.expires_at > now + 300) { // 5 minutes buffer
      return account.access_token
    }

    // Token expired or will expire soon, refresh it
    if (!account.refresh_token) {
      console.error('No refresh token available for user:', account.userId)
      return null
    }

    console.log('Refreshing Spotify token for user:', account.userId)
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

export async function getTopTracks(accessToken: string, limit: number = 50): Promise<SpotifyTrack[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=short_term`,
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
