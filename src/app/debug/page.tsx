'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function DebugPage() {
  const { data: session } = useSession()
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [testUrl, setTestUrl] = useState('https://open.spotify.com/playlist/37i9dQZF1EJLUcPEkMfEVd')

  const testSpotifyAPI = async () => {
    try {
      const response = await fetch('/api/debug/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: testUrl }),
      })
      
      const data = await response.json()
      setDebugInfo(data)
    } catch (error) {
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Spotify Debug Page</h1>
        
        {/* Session Info */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Information</h2>
          <pre className="bg-gray-700 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        {/* Test Playlist */}
        <div className="bg-gray-800 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Playlist Access</h2>
          <div className="space-y-4">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 rounded border border-gray-600"
              placeholder="Spotify playlist URL"
            />
            <button
              onClick={testSpotifyAPI}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
            >
              Test Playlist Access
            </button>
          </div>
        </div>

        {/* Debug Results */}
        {debugInfo && (
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
            <pre className="bg-gray-700 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
