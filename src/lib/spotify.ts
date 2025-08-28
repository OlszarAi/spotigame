import SpotifyWebApi from 'spotify-web-api-node'

export interface SpotifyTrack {
  id: string
  name: string
  artists: Array<{ name: string }>
  preview_url: string | null
  external_urls: { spotify: string }
  album: {
    name: string
    images: Array<{ url: string; height?: number; width?: number }>
  }
}

export interface UserTopTracks {
  userId: string
  username: string
  tracks: SpotifyTrack[]
}

async function refreshSpotifyToken(userId: string, refreshToken: string): Promise<string | null> {
  try {
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    })

    spotifyApi.setRefreshToken(refreshToken)
    const data = await spotifyApi.refreshAccessToken()
    const newAccessToken = data.body.access_token

    // Update the access token in the database
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase
      .from('accounts')
      .update({ access_token: newAccessToken })
      .eq('userId', userId)
      .eq('provider', 'spotify')

    return newAccessToken
  } catch (error) {
    console.error('Error refreshing Spotify token:', error)
    return null
  }
}

export async function fetchUserTopTracks(accessToken: string, userId?: string, refreshToken?: string): Promise<SpotifyTrack[]> {
  try {
    const spotifyApi = new SpotifyWebApi()
    spotifyApi.setAccessToken(accessToken)

    // Try multiple time ranges to get more tracks with previews
    const timeRanges = ['short_term', 'medium_term', 'long_term'] as const
    let allTracks: SpotifyTrack[] = []

    for (const timeRange of timeRanges) {
      try {
        const response = await spotifyApi.getMyTopTracks({
          time_range: timeRange,
          limit: 50 // Spotify API maximum limit is 50
        })

        const tracks = response.body.items.map(track => ({
          id: track.id,
          name: track.name,
          artists: track.artists.map(artist => ({ name: artist.name })),
          preview_url: track.preview_url,
          external_urls: track.external_urls,
          album: {
            name: track.album.name,
            images: track.album.images
          }
        }))

        allTracks = [...allTracks, ...tracks]
        
        // If we have enough tracks with previews, we can stop
        const tracksWithPreviews = allTracks.filter(track => track.preview_url)
        if (tracksWithPreviews.length >= 20) {
          break
        }
      } catch (timeRangeError) {
        console.log(`Failed to fetch ${timeRange} tracks:`, timeRangeError)
        continue
      }
    }

    // Remove duplicates based on track ID
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    )

    console.log(`User ${userId}: Fetched ${uniqueTracks.length} unique tracks across all time ranges`)
    const tracksWithPreviews = uniqueTracks.filter(track => track.preview_url)
    console.log(`User ${userId}: ${tracksWithPreviews.length} tracks have preview URLs`)

    return uniqueTracks
  } catch (error: unknown) {
    // If token is expired and we have refresh token, try to refresh
    const spotifyError = error as { statusCode?: number }
    if (spotifyError?.statusCode === 401 && userId && refreshToken) {
      console.log(`Access token expired for user ${userId}, attempting to refresh...`)
      const newAccessToken = await refreshSpotifyToken(userId, refreshToken)
      
      if (newAccessToken) {
        // Retry with new token (simplified retry - just short_term for now)
        const spotifyApi = new SpotifyWebApi()
        spotifyApi.setAccessToken(newAccessToken)
        try {
          const response = await spotifyApi.getMyTopTracks({
            time_range: 'short_term',
            limit: 50
          })

          return response.body.items.map(track => ({
            id: track.id,
            name: track.name,
            artists: track.artists.map(artist => ({ name: artist.name })),
            preview_url: track.preview_url,
            external_urls: track.external_urls,
            album: {
              name: track.album.name,
              images: track.album.images
            }
          }))
        } catch (retryError) {
          console.error('Error fetching top tracks after token refresh:', retryError)
          throw new Error('Failed to fetch Spotify tracks after token refresh')
        }
      }
    }
    
    console.error('Error fetching top tracks:', error)
    throw new Error('Failed to fetch Spotify tracks')
  }
}

export function createTrackPool(userTracks: UserTopTracks[]): Array<SpotifyTrack & { ownerId: string; ownerName: string }> {
  const pool: Array<SpotifyTrack & { ownerId: string; ownerName: string }> = []
  
  userTracks.forEach(({ userId, username, tracks }) => {
    const tracksWithPreview = tracks.filter(track => track.preview_url)
    console.log(`User ${username}: ${tracks.length} total tracks, ${tracksWithPreview.length} with preview_url`)
    
    tracksWithPreview.forEach(track => {
      pool.push({
        ...track,
        ownerId: userId,
        ownerName: username
      })
    })
  })

  console.log(`Total track pool size: ${pool.length} tracks with previews`)
  
  // If we don't have enough tracks with previews, we should still allow the game to start
  // The game can work with even 1 track, though it's not ideal
  if (pool.length < 5) {
    console.warn(`Warning: Only ${pool.length} tracks available with previews. Game may have limited variety.`)
  }
  
  return pool
}

export function selectRandomTrack(pool: Array<SpotifyTrack & { ownerId: string; ownerName: string }>): SpotifyTrack & { ownerId: string; ownerName: string } | null {
  if (pool.length === 0) return null
  
  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}
