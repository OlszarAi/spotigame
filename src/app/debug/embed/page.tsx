'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import SpotifyEmbedPlayer from '@/components/spotify-embed-player'

const SAMPLE_TRACKS = [
  { 
    id: '4uLU6hMCjMI75M1A2tKUQC', 
    name: 'Blinding Lights', 
    artist: 'The Weeknd',
    hasPreview: false 
  },
  { 
    id: '7qEHsqek33rTcFNT9PFqLf', 
    name: 'Someone Like You', 
    artist: 'Adele',
    hasPreview: false 
  },
  { 
    id: '3n3Ppam7vgaVa1iaRUc9LP', 
    name: 'Mr. Brightside', 
    artist: 'The Killers',
    hasPreview: false 
  },
  { 
    id: '1rqqCSm0Qe4I9rUvWncaom', 
    name: 'Tyle mam', 
    artist: 'Mata',
    hasPreview: false 
  },
  { 
    id: '0VjIjW4GlUZAMYd2vXMi3b', 
    name: 'Never Gonna Give You Up', 
    artist: 'Rick Astley',
    hasPreview: false 
  },
  { 
    id: '5FVd6KXrgO9B3JPmC8OPst', 
    name: 'Despacito', 
    artist: 'Luis Fonsi ft. Daddy Yankee',
    hasPreview: false 
  },
  { 
    id: '4iV5W9uYEdYUVa79Axb7Rh', 
    name: 'New York State of Mind', 
    artist: 'Billy Joel',
    hasPreview: false 
  }
]

export default function EmbedTestPage() {
  const router = useRouter()
  const [selectedTrack, setSelectedTrack] = useState(SAMPLE_TRACKS[0])
  const [customTrackId, setCustomTrackId] = useState('')

  const handleCustomTrack = () => {
    if (customTrackId.trim()) {
      let trackId = customTrackId.trim()
      
      // Extract track ID from Spotify URL if needed
      const spotifyUrlMatch = trackId.match(/track\/([a-zA-Z0-9]+)/)
      if (spotifyUrlMatch) {
        trackId = spotifyUrlMatch[1]
      }
      
      setSelectedTrack({
        id: trackId,
        name: 'Custom Track',
        artist: 'Unknown Artist',
        hasPreview: false
      })
      setCustomTrackId('') // Clear input
    }
  }

  return (
    <div className="min-h-screen bg-spotify-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-spotify-dark-gray rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold">Spotify Embed Test</h1>
        </div>

        <div className="mb-8 p-4 bg-spotify-dark-gray rounded-lg">
          <h2 className="text-xl font-semibold mb-4">🎯 Solution for Spotify API Crisis</h2>
          <div className="space-y-2 text-spotify-light-gray">
            <p>✅ <strong>Spotify Embeds</strong> still work and provide 30-second previews</p>
            <p>✅ No API keys required - direct iframe integration</p>
            <p>✅ Works for all tracks (not limited by API deprecation)</p>
            <p>✅ Official Spotify solution, stable and reliable</p>
            <p>⚠️ Slightly larger UI footprint than custom audio player</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Track Selector */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Select Track</h3>
            
            {/* Custom Track ID Input */}
            <div className="mb-4 p-3 bg-blue-600/20 border border-blue-400 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-400">Test Custom Track ID</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTrackId}
                  onChange={(e) => setCustomTrackId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomTrack()}
                  placeholder="Wklej Spotify track ID lub URL..."
                  className="flex-1 px-3 py-2 bg-spotify-dark-gray border border-gray-600 rounded text-white placeholder-gray-400"
                />
                <button
                  onClick={handleCustomTrack}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  Test
                </button>
              </div>
              <p className="text-xs text-blue-300 mt-1">
                Możesz wkleić pełny URL (będzie wyciągnięty ID) lub samo ID utworu
              </p>
            </div>

            <div className="space-y-2">{SAMPLE_TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrack(track)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedTrack.id === track.id 
                      ? 'bg-spotify-green text-black' 
                      : 'bg-spotify-dark-gray hover:bg-gray-600'
                  }`}
                >
                  <div className="font-medium">{track.name}</div>
                  <div className="text-sm opacity-75">{track.artist}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Player Tests */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Audio Players</h3>
            
            <div className="space-y-6">
              {/* Spotify Embed Player */}
              <div>
                <h4 className="font-medium mb-2 text-spotify-green">Spotify Embed Player</h4>
                <SpotifyEmbedPlayer 
                  trackId={selectedTrack.id}
                  height={152}
                />
                <p className="text-xs text-spotify-light-gray mt-2">
                  Official Spotify iframe embed - works for all tracks without API keys
                </p>
              </div>

              {/* Compact Embed */}
              <div>
                <h4 className="font-medium mb-2 text-blue-400">Compact Embed (80px height)</h4>
                <SpotifyEmbedPlayer 
                  trackId={selectedTrack.id}
                  height={80}
                />
                <p className="text-xs text-spotify-light-gray mt-2">
                  Smaller version for games with limited space
                </p>
              </div>

              {/* Custom Themed Embed */}
              <div>
                <h4 className="font-medium mb-2 text-purple-400">Custom Themed</h4>
                <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-4 rounded-lg border border-purple-400/30">
                  <SpotifyEmbedPlayer 
                    trackId={selectedTrack.id}
                    height={152}
                  />
                </div>
                <p className="text-xs text-spotify-light-gray mt-2">
                  Example with custom container styling
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-green-600/20 border border-green-400 rounded-lg">
          <h3 className="text-lg font-semibold text-green-400 mb-2">✅ Simple & Reliable Solution</h3>
          <div className="space-y-1 text-sm">
            <p>✅ Spotify Embed Player - Ready and deployed in game</p>
            <p>✅ No API dependencies - works with just track IDs</p>
            <p>✅ 30-second previews for all tracks</p>
            <p>✅ Clean, simple implementation without complex fallbacks</p>
          </div>
        </div>
      </div>
    </div>
  )
}
