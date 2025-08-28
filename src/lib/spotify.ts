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

// Function to get preview URL using workaround for development mode
async function getPreviewUrl(trackId: string, artistName: string, trackName: string): Promise<string | null> {
  try {
    // Try the spotify-preview-finder package first
    const previewUrl = await spotifyPreviewFinder(trackId)
    if (previewUrl) {
      // Make sure we get the URL string, not an object
      const urlString = typeof previewUrl === 'string' ? previewUrl : previewUrl.url || previewUrl.toString()
      console.log(`Found preview URL for "${trackName}" by ${artistName}: ${urlString}`)
      return urlString
    }
    
    // Alternative: construct potential preview URL based on track ID
    // Spotify preview URLs follow a pattern: https://p.scdn.co/mp3-preview/[hash]
    // This is a fallback that sometimes works
    const possibleUrl = `https://p.scdn.co/mp3-preview/${trackId}`
    
    // Test if the URL exists by making a HEAD request
    try {
      const response = await fetch(possibleUrl, { method: 'HEAD' })
      if (response.ok) {
        console.log(`Found alternative preview URL for "${trackName}" by ${artistName}: ${possibleUrl}`)
        return possibleUrl
      }
    } catch {
      // Ignore fetch errors
    }
    
    console.log(`No preview URL found for "${trackName}" by ${artistName}`)
    return null
  } catch (error) {
    console.log(`Error getting preview URL for "${trackName}" by ${artistName}:`, error)
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
    
    // First, let's test with a specific popular track to see the response format
    try {
      const testSearch = await spotifyApi.searchTracks('Blinding Lights The Weeknd', { 
        limit: 1,
        market: 'US' // Try US market explicitly
      })
      if (testSearch.body.tracks && testSearch.body.tracks.items.length > 0) {
        const testTrack = testSearch.body.tracks.items[0]
        console.log(`TEST TRACK (US market) - Name: "${testTrack.name}", Preview: ${testTrack.preview_url || 'NULL'}`)
        
        // Try without market parameter too
        const testSearchNoMarket = await spotifyApi.searchTracks('Blinding Lights The Weeknd', { limit: 1 })
        if (testSearchNoMarket.body.tracks && testSearchNoMarket.body.tracks.items.length > 0) {
          const testTrackNoMarket = testSearchNoMarket.body.tracks.items[0]
          console.log(`TEST TRACK (no market) - Name: "${testTrackNoMarket.name}", Preview: ${testTrackNoMarket.preview_url || 'NULL'}`)
        }
      }
    } catch (testError) {
      console.log('Test search failed:', testError)
    }

    // Try multiple time ranges to get more tracks with previews
    const timeRanges = ['short_term', 'medium_term', 'long_term'] as const
    let allTracks: SpotifyTrack[] = []

    for (const timeRange of timeRanges) {
      try {
        const response = await spotifyApi.getMyTopTracks({
          time_range: timeRange,
          limit: 50 // Spotify API maximum limit is 50
        })

        const tracks = response.body.items.map(track => {
          console.log(`Track: "${track.name}" by ${track.artists[0]?.name} - preview_url: ${track.preview_url || 'NULL'}`)
          return {
            id: track.id,
            name: track.name,
            artists: track.artists.map(artist => ({ name: artist.name })),
            preview_url: track.preview_url,
            external_urls: track.external_urls,
            album: {
              name: track.album.name,
              images: track.album.images
            }
          }
        })

        // If tracks don't have preview URLs, try to get them using workaround
        const tracksWithWorkaroundPreviews = await Promise.all(
          tracks.map(async (track) => {
            if (!track.preview_url) {
              const workaroundPreview = await getPreviewUrl(
                track.id,
                track.artists[0]?.name || 'Unknown',
                track.name
              )
              return {
                ...track,
                preview_url: workaroundPreview
              }
            }
            return track
          })
        )

        allTracks = [...allTracks, ...tracksWithWorkaroundPreviews]
        
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

    // If we don't have enough tracks with previews from top tracks, try recently played
    if (tracksWithPreviews.length < 10) {
      console.log(`User ${userId}: Trying recently played tracks as fallback...`)
      try {
        const recentResponse = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 })
        const recentTracks = recentResponse.body.items.map(item => {
          const track = item.track
          console.log(`Recent Track: "${track.name}" by ${track.artists[0]?.name} - preview_url: ${track.preview_url || 'NULL'}`)
          return {
            id: track.id,
            name: track.name,
            artists: track.artists.map(artist => ({ name: artist.name })),
            preview_url: track.preview_url,
            external_urls: track.external_urls,
            album: {
              name: track.album.name,
              images: track.album.images
            }
          }
        })
        
        // Add recent tracks that aren't already in our collection
        const newRecentTracks = recentTracks.filter(recent => 
          !uniqueTracks.some(existing => existing.id === recent.id)
        )
        
        allTracks = [...uniqueTracks, ...newRecentTracks]
        console.log(`User ${userId}: Added ${newRecentTracks.length} new tracks from recently played`)
      } catch (recentError) {
        console.log(`Failed to fetch recently played tracks for user ${userId}:`, recentError)
      }
    } else {
      allTracks = uniqueTracks
    }

    return allTracks
  } catch (error: unknown) {
    // If token is expired and we have refresh token, try to refresh
    const spotifyError = error as { statusCode?: number }
    if (spotifyError?.statusCode === 401 && userId && refreshToken) {
      console.log(`Access token expired for user ${userId}, attempting to refresh...`)
      const refreshResult = await refreshSpotifyToken(userId, refreshToken)
      
      if (refreshResult) {
        // Retry with new token - full retry with all time ranges
        console.log(`Retrying with refreshed token for user ${userId}`)
        return await fetchUserTopTracks(refreshResult.accessToken, userId, refreshToken)
      } else {
        console.error(`Failed to refresh token for user ${userId}`)
      }
    }
    
    console.error('Error in fetchUserTopTracks:', error)
    
    // FALLBACK: If personal tracks fail, try using popular tracks from search
    console.log(`Fallback: Using popular tracks from search API for user ${userId}`)
    try {
      const spotifyApi = new SpotifyWebApi()
      spotifyApi.setAccessToken(accessToken)
      
      const popularQueries = [
        'year:2024', 'year:2023', 'genre:pop', 'genre:hip-hop', 'genre:rock'
      ]
      
      const fallbackTracks: SpotifyTrack[] = []
      
      for (const query of popularQueries) {
        try {
          const searchResponse = await spotifyApi.searchTracks(query, { 
            limit: 10,
            market: 'US'
          })
          
          const tracks = searchResponse.body.tracks?.items.map(track => {
            console.log(`Fallback Track: "${track.name}" by ${track.artists[0]?.name} - preview_url: ${track.preview_url || 'NULL'}`)
            return {
              id: track.id,
              name: track.name,
              artists: track.artists.map(artist => ({ name: artist.name })),
              preview_url: track.preview_url,
              external_urls: track.external_urls,
              album: {
                name: track.album.name,
                images: track.album.images
              }
            }
          }) || []
          
          // Apply workaround for missing preview URLs
          const tracksWithWorkaroundPreviews = await Promise.all(
            tracks.map(async (track) => {
              if (!track.preview_url) {
                const workaroundPreview = await getPreviewUrl(
                  track.id,
                  track.artists[0]?.name || 'Unknown',
                  track.name
                )
                return {
                  ...track,
                  preview_url: workaroundPreview
                }
              }
              return track
            })
          )
          
          fallbackTracks.push(...tracksWithWorkaroundPreviews)
          
          if (fallbackTracks.length >= 20) break
        } catch (searchError) {
          console.log(`Failed search for ${query}:`, searchError)
        }
      }
      
      console.log(`Fallback: Got ${fallbackTracks.length} tracks from search`)
      const tracksWithPreviews = fallbackTracks.filter(track => track.preview_url)
      console.log(`Fallback: ${tracksWithPreviews.length} tracks have preview URLs`)
      
      return fallbackTracks
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError)
      throw new Error('Failed to fetch any tracks')
    }
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
