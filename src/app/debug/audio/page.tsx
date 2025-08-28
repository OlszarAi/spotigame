'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Play, Pause, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TestTrack {
  id: string
  name: string
  artist: string
  originalPreview?: string | null
  finderPreview?: string | null
  searchPreview?: string | null
  tested?: boolean
}

const SAMPLE_TRACKS: TestTrack[] = [
  // Popular tracks that might have previews
  { id: '4uLU6hMCjMI75M1A2tKUQC', name: 'Blinding Lights', artist: 'The Weeknd' },
  { id: '7qEHsqek33rTcFNT9PFqLf', name: 'Someone Like You', artist: 'Adele' },
  { id: '5Z01UMMf7V1o0MzF86s6WJ', name: 'Bohemian Rhapsody - Remastered 2011', artist: 'Queen' },
  { id: '3n3Ppam7vgaVa1iaRUc9LP', name: 'Mr. Brightside', artist: 'The Killers' },
  { id: '4iV5W9uYEdYUVa79Axb7Rh', name: 'New York State of Mind', artist: 'Billy Joel' },
  { id: '0VjIjW4GlUK7RjwDa4LYhf', name: 'Someone You Loved', artist: 'Lewis Capaldi' },
  { id: '60nZcImufyMA1MKQY3dcCH', name: 'Watermelon Sugar', artist: 'Harry Styles' },
  // Polish tracks from logs
  { id: '2YKCYP9R94kPaE4NdkZwGx', name: 'Kids', artist: 'MGMT' },
  { id: '1BxfuPKGuaTgP7aM0Bbdwr', name: 'Talking to the Moon', artist: 'Bruno Mars' },
]

export default function AudioDebugPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [tracks, setTracks] = useState<TestTrack[]>(SAMPLE_TRACKS)
  const [testing, setTesting] = useState<string | null>(null)
  const [playingTrack, setPlayingTrack] = useState<string | null>(null)
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

  const testTrack = async (track: TestTrack) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const extendedSession = session as any
    if (!extendedSession?.accessToken) {
      alert('No access token available')
      return
    }

    setTesting(track.id)
    try {
      const response = await fetch('/api/debug/test-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackId: track.id,
          trackName: track.name,
          artistName: track.artist,
          accessToken: extendedSession.accessToken
        })
      })

      const result = await response.json()
      
      setTracks(prev => prev.map(t => 
        t.id === track.id ? {
          ...t,
          originalPreview: result.originalPreview,
          finderPreview: result.finderPreview,
          searchPreview: result.searchPreview,
          tested: true
        } : t
      ))
    } catch (error) {
      console.error('Error testing track:', error)
    }
    setTesting(null)
  }

  const playPreview = (url: string, trackId: string) => {
    if (audio) {
      audio.pause()
      setAudio(null)
    }

    if (playingTrack === trackId) {
      setPlayingTrack(null)
      return
    }

    const newAudio = new Audio(url)
    newAudio.play()
    setPlayingTrack(trackId)
    setAudio(newAudio)

    newAudio.onended = () => {
      setPlayingTrack(null)
      setAudio(null)
    }

    newAudio.onerror = () => {
      alert('Error playing audio')
      setPlayingTrack(null)
      setAudio(null)
    }
  }

  const testAllTracks = async () => {
    for (const track of tracks) {
      await testTrack(track)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-spotify-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-spotify-light-gray">Please log in to test audio functionality</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-spotify-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-4 py-2 bg-spotify-dark-gray rounded-lg hover:bg-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-bold">Audio Debug Page</h1>
        </div>

        <div className="mb-6 p-4 bg-spotify-dark-gray rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Test Information</h2>
          <p className="text-spotify-light-gray mb-2">
            This page tests different strategies for finding Spotify preview URLs:
          </p>
          <ul className="list-disc list-inside text-spotify-light-gray space-y-1">
            <li><strong>Original Preview:</strong> Direct from Spotify Web API</li>
            <li><strong>Finder Preview:</strong> Using spotify-preview-finder package</li>
            <li><strong>Search Preview:</strong> Alternative search method</li>
          </ul>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={testAllTracks}
            disabled={testing !== null}
            className="px-6 py-3 bg-spotify-green text-black font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? 'Testing...' : 'Test All Tracks'}
          </button>
        </div>

        <div className="grid gap-4">
          {tracks.map((track) => (
            <div key={track.id} className="p-4 bg-spotify-dark-gray rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{track.name}</h3>
                  <p className="text-spotify-light-gray">{track.artist}</p>
                  <p className="text-sm text-gray-500">{track.id}</p>
                </div>
                <button
                  onClick={() => testTrack(track)}
                  disabled={testing === track.id}
                  className="px-4 py-2 bg-spotify-green text-black font-semibold rounded-lg hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {testing === track.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test'
                  )}
                </button>
              </div>

              {track.tested && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-spotify-black rounded">
                    <h4 className="font-medium mb-2">Original Preview</h4>
                    {track.originalPreview ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playPreview(track.originalPreview!, `${track.id}-original`)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 rounded text-sm"
                        >
                          {playingTrack === `${track.id}-original` ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          Play
                        </button>
                        <span className="text-green-400 text-sm">✅ Available</span>
                      </div>
                    ) : (
                      <span className="text-red-400 text-sm">❌ Not available</span>
                    )}
                  </div>

                  <div className="p-3 bg-spotify-black rounded">
                    <h4 className="font-medium mb-2">Finder Preview</h4>
                    {track.finderPreview ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playPreview(track.finderPreview!, `${track.id}-finder`)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 rounded text-sm"
                        >
                          {playingTrack === `${track.id}-finder` ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          Play
                        </button>
                        <span className="text-green-400 text-sm">✅ Available</span>
                      </div>
                    ) : (
                      <span className="text-red-400 text-sm">❌ Not available</span>
                    )}
                  </div>

                  <div className="p-3 bg-spotify-black rounded">
                    <h4 className="font-medium mb-2">Search Preview</h4>
                    {track.searchPreview ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => playPreview(track.searchPreview!, `${track.id}-search`)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 rounded text-sm"
                        >
                          {playingTrack === `${track.id}-search` ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                          Play
                        </button>
                        <span className="text-green-400 text-sm">✅ Available</span>
                      </div>
                    ) : (
                      <span className="text-red-400 text-sm">❌ Not available</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
