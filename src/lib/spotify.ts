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

export async function fetchUserTopTracks(accessToken: string): Promise<SpotifyTrack[]> {
  const spotifyApi = new SpotifyWebApi()
  spotifyApi.setAccessToken(accessToken)

  try {
    const response = await spotifyApi.getMyTopTracks({
      time_range: 'short_term',
      limit: 100
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
  } catch (error) {
    console.error('Error fetching top tracks:', error)
    throw new Error('Failed to fetch Spotify tracks')
  }
}

export function createTrackPool(userTracks: UserTopTracks[]): Array<SpotifyTrack & { ownerId: string; ownerName: string }> {
  const pool: Array<SpotifyTrack & { ownerId: string; ownerName: string }> = []
  
  userTracks.forEach(({ userId, username, tracks }) => {
    tracks.forEach(track => {
      // Only include tracks with preview URLs
      if (track.preview_url) {
        pool.push({
          ...track,
          ownerId: userId,
          ownerName: username
        })
      }
    })
  })

  return pool
}

export function selectRandomTrack(pool: Array<SpotifyTrack & { ownerId: string; ownerName: string }>): SpotifyTrack & { ownerId: string; ownerName: string } | null {
  if (pool.length === 0) return null
  
  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}
