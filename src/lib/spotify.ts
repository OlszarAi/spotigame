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

export async function getTopTracks(accessToken: string, limit: number = 20): Promise<SpotifyTrack[]> {
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/top/tracks?limit=${limit}&time_range=medium_term`,
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
