import SpotifyWebApi from 'spotify-web-api-node'
// @ts-expect-error - no types available for this package
import spotifyPreviewFinder from 'spotify-preview-finder'

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

interface SpotifyApiTrack {
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

interface SpotifyApiRecentTrack {
  track: SpotifyApiTrack
}

// Function to get preview URL using multiple strategies
async function getPreviewUrl(trackId: string, artistName: string, trackName: string): Promise<string | null> {
  try {
    // Strategy 1: Try the spotify-preview-finder package
    try {
      const previewUrl = await spotifyPreviewFinder(trackId)
      if (previewUrl) {
        const urlString = typeof previewUrl === 'string' ? previewUrl : previewUrl.url || previewUrl.toString()
        if (urlString && urlString.startsWith('http')) {
          console.log(`✅ Found preview URL via finder for "${trackName}" by ${artistName}`)
          return urlString
        }
      }
    } catch (finderError) {
      console.log(`Finder failed for "${trackName}":`, finderError)
    }
    
    // Strategy 2: Try constructing direct Spotify preview URL
    const directUrl = `https://p.scdn.co/mp3-preview/${trackId}`
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const response = await fetch(directUrl, { 
        method: 'HEAD',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (response.ok && response.headers.get('content-type')?.includes('audio')) {
        console.log(`✅ Found direct preview URL for "${trackName}" by ${artistName}`)
        return directUrl
      }
    } catch {
      // Ignore fetch errors for direct URL
    }
    
    // Strategy 3: Try alternative Spotify CDN URLs
    const alternativeUrls = [
      `https://p.scdn.co/mp3-preview/${trackId}?cid=null`,
      `https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview128/${trackId}.m4a`,
    ]
    
    for (const url of alternativeUrls) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)
        
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        if (response.ok) {
          console.log(`✅ Found alternative preview URL for "${trackName}" by ${artistName}`)
          return url
        }
      } catch {
        continue
      }
    }
    
    console.log(`❌ No preview URL found for "${trackName}" by ${artistName}`)
    return null
  } catch (error) {
    console.log(`❌ Error getting preview URL for "${trackName}" by ${artistName}:`, error)
    return null
  }
}

export interface UserTopTracks {
  userId: string
  username: string
  tracks: SpotifyTrack[]
}

export async function refreshSpotifyToken(userId: string, refreshToken: string): Promise<{accessToken: string, expiresAt: number} | null> {
  try {
    const spotifyApi = new SpotifyWebApi({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
    })

    spotifyApi.setRefreshToken(refreshToken)
    const data = await spotifyApi.refreshAccessToken()
    const refreshedTokens = data.body
    const newExpiresAt = Math.floor(Date.now() / 1000 + refreshedTokens.expires_in)

    // Update the access token in the database
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    await supabase
      .from('accounts')
      .update({ 
        access_token: refreshedTokens.access_token,
        expires_at: newExpiresAt,
        refresh_token: refreshedTokens.refresh_token ?? refreshToken
      })
      .eq('userId', userId)
      .eq('provider', 'spotify')

    console.log(`✅ Token refreshed for user ${userId}`)
    return {
      accessToken: refreshedTokens.access_token,
      expiresAt: newExpiresAt
    }
  } catch (error) {
    console.error('Error refreshing Spotify token:', error)
    return null
  }
}

export async function fetchUserTopTracks(accessToken: string, userId?: string, refreshToken?: string): Promise<SpotifyTrack[]> {
  try {
    const spotifyApi = new SpotifyWebApi()
    spotifyApi.setAccessToken(accessToken)

    console.log(`Starting track fetch for user ${userId}`)
    
    // Try multiple time ranges and sources to get tracks with previews
    const timeRanges = ['short_term', 'medium_term', 'long_term'] as const
    let allTracks: SpotifyTrack[] = []

    // Strategy 1: Get top tracks across all time ranges
    for (const timeRange of timeRanges) {
      try {
        const response = await spotifyApi.getMyTopTracks({
          time_range: timeRange,
          limit: 50
        })

        const tracks: SpotifyTrack[] = response.body.items.map((track: SpotifyApiTrack) => {
          const hasPreview = track.preview_url ? '✅' : '❌'
          console.log(`Track: ${track.name} by ${track.artists[0]?.name} ${hasPreview}`)
          
          return {
            id: track.id,
            name: track.name,
            artists: track.artists.map((artist: { name: string }) => ({ name: artist.name })),
            preview_url: track.preview_url,
            external_urls: track.external_urls,
            album: track.album
          }
        })

        allTracks = [...allTracks, ...tracks]
      } catch (timeRangeError) {
        console.log(`Failed to fetch ${timeRange} tracks:`, timeRangeError)
        continue
      }
    }

    // Strategy 2: Get recently played tracks
    try {
      const recentResponse = await spotifyApi.getMyRecentlyPlayedTracks({ 
        limit: 50
      })
      const recentTracks: SpotifyTrack[] = recentResponse.body.items.map((item: SpotifyApiRecentTrack) => {
        const track = item.track
        const hasPreview = track.preview_url ? '✅' : '❌'
        console.log(`Recent Track: "${track.name}" by ${track.artists[0]?.name} - preview: ${hasPreview}`)
        return {
          id: track.id,
          name: track.name,
          artists: track.artists.map((artist: { name: string }) => ({ name: artist.name })),
          preview_url: track.preview_url,
          external_urls: track.external_urls,
          album: {
            name: track.album.name,
            images: track.album.images
          }
        }
      })
      
      allTracks = [...allTracks, ...recentTracks]
    } catch (recentError) {
      console.log(`Failed to fetch recently played tracks for user ${userId}:`, recentError)
    }

    // Remove duplicates based on track ID
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    )

    // Separate tracks with and without previews
    const tracksWithPreviews = uniqueTracks.filter(track => track.preview_url)
    const tracksWithoutPreviews = uniqueTracks.filter(track => !track.preview_url)

    console.log(`User ${userId}: ${uniqueTracks.length} unique tracks (${tracksWithPreviews.length} with previews, ${tracksWithoutPreviews.length} without)`)

    // Strategy 3: Try to get preview URLs for tracks that don't have them
    const batchSize = 10 // Process in smaller batches to avoid overwhelming
    const enhancedTracks = [...tracksWithPreviews] // Start with tracks that already have previews
    
    for (let i = 0; i < tracksWithoutPreviews.length && enhancedTracks.length < 30; i += batchSize) {
      const batch = tracksWithoutPreviews.slice(i, i + batchSize)
      const enhancedBatch = await Promise.all(
        batch.map(async (track) => {
          const workaroundPreview = await getPreviewUrl(
            track.id,
            track.artists[0]?.name || 'Unknown',
            track.name
          )
          return {
            ...track,
            preview_url: workaroundPreview
          }
        })
      )
      
      // Add tracks that now have preview URLs
      const successfulTracks = enhancedBatch.filter(track => track.preview_url)
      enhancedTracks.push(...successfulTracks)
      
      console.log(`Batch ${Math.floor(i/batchSize) + 1}: Found ${successfulTracks.length}/${batch.length} preview URLs`)
      
      // If we have enough tracks with previews, stop processing
      if (enhancedTracks.length >= 20) {
        break
      }
    }

    const finalTracksWithPreviews = enhancedTracks.filter(track => track.preview_url)
    console.log(`User ${userId}: Final result - ${finalTracksWithPreviews.length} tracks with preview URLs`)

    return enhancedTracks
  } catch (error: unknown) {
    // If token is expired and we have refresh token, try to refresh
    const spotifyError = error as { statusCode?: number }
    if (spotifyError?.statusCode === 401 && userId && refreshToken) {
      console.log(`Access token expired for user ${userId}, attempting to refresh...`)
      const refreshResult = await refreshSpotifyToken(userId, refreshToken)
      
      if (refreshResult) {
        console.log(`Retrying with refreshed token for user ${userId}`)
        return await fetchUserTopTracks(refreshResult.accessToken, userId, refreshToken)
      } else {
        console.error(`Failed to refresh token for user ${userId}`)
      }
    }
    
    console.error('Error in fetchUserTopTracks:', error)
    
    // FALLBACK: If personal tracks fail, try using popular tracks from search
    console.log(`Fallback: Using popular tracks from search API for user ${userId}`)
    return await getPopularTracksAsFallback(accessToken)
  }
}

// New fallback function for popular tracks
async function getPopularTracksAsFallback(accessToken: string): Promise<SpotifyTrack[]> {
  try {
    const spotifyApi = new SpotifyWebApi()
    spotifyApi.setAccessToken(accessToken)
    
    const popularQueries = [
      'year:2024 genre:pop',
      'year:2023 genre:hip-hop', 
      'year:2024 genre:rock',
      'The Weeknd',
      'Ed Sheeran',
      'Dua Lipa',
      'Ariana Grande',
      'Justin Bieber'
    ]
    
    const fallbackTracks: SpotifyTrack[] = []
    
    for (const query of popularQueries) {
      try {
        const searchResponse = await spotifyApi.searchTracks(query, { 
          limit: 10,
          market: 'US'
        })
        
        const tracks: SpotifyTrack[] = searchResponse.body.tracks?.items.map((track: SpotifyApiTrack) => {
          const hasPreview = track.preview_url ? '✅' : '❌'
          console.log(`Fallback Track: "${track.name}" by ${track.artists[0]?.name} - preview: ${hasPreview}`)
          return {
            id: track.id,
            name: track.name,
            artists: track.artists.map((artist: { name: string }) => ({ name: artist.name })),
            preview_url: track.preview_url,
            external_urls: track.external_urls,
            album: {
              name: track.album.name,
              images: track.album.images
            }
          }
        }) || []
        
        // Prioritize tracks that already have preview URLs
        const tracksWithPreviews = tracks.filter(track => track.preview_url)
        fallbackTracks.push(...tracksWithPreviews)
        
        if (fallbackTracks.length >= 15) break
      } catch (searchError) {
        console.log(`Failed search for ${query}:`, searchError)
      }
    }
    
    console.log(`Fallback: Got ${fallbackTracks.length} tracks with preview URLs`)
    return fallbackTracks
  } catch (fallbackError) {
    console.error('Fallback search also failed:', fallbackError)
    throw new Error('Failed to fetch any tracks')
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
