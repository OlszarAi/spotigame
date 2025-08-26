'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'

export default function DebugPage() {
  const { data: session, status } = useSession()
  const [debugResults, setDebugResults] = useState<any>(null)
  const [envCheck, setEnvCheck] = useState<any>(null)
  const [testUrl, setTestUrl] = useState('https://open.spotify.com/playlist/37i9dQZF1EJLUcPEkMfEVd')
  const [loading, setLoading] = useState(false)

  const testPlaylistAccess = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/spotify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistUrl: testUrl })
      })
      const data = await response.json()
      setDebugResults(data)
    } catch (error) {
      setDebugResults({ error: `Failed to test: ${error}` })
    } finally {
      setLoading(false)
    }
  }

  const checkEnvironment = async () => {
    try {
      const response = await fetch('/api/debug/env')
      const data = await response.json()
      setEnvCheck(data)
    } catch (error) {
      setEnvCheck({ error: `Failed to check environment: ${error}` })
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-green-500">SpotiGame Debug</h1>
        
        {/* Environment Check */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Environment Variables</h2>
            <button
              onClick={checkEnvironment}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Check Environment
            </button>
          </div>
          {envCheck && (
            <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(envCheck, null, 2)}
            </pre>
          )}
        </div>

        {/* Session Information */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Session Information</h2>
          <div className="bg-gray-800 p-4 rounded">
            <pre className="text-sm overflow-auto">
              {JSON.stringify({
                status,
                user: session?.user || null,
                expires: session?.expires || null,
                accessToken: !!(session as any)?.accessToken ? 'Present' : 'Missing',
                refreshToken: !!(session as any)?.refreshToken ? 'Present' : 'Missing',
                error: (session as any)?.error || null
              }, null, 2)}
            </pre>
          </div>
        </div>

        {/* Test Playlist Access */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Test Playlist Access</h2>
          <div className="mb-4">
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 text-white rounded border border-gray-700"
              placeholder="Spotify playlist URL"
            />
          </div>
          <button
            onClick={testPlaylistAccess}
            disabled={loading}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Playlist Access'}
          </button>
        </div>

        {/* Debug Results */}
        {debugResults && (
          <div className="bg-gray-900 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
            <pre className="bg-gray-800 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugResults, null, 2)}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Troubleshooting Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Check if environment variables are properly set on Vercel</li>
            <li>Verify Spotify app settings and redirect URIs</li>
            <li>Sign out completely and sign back in</li>
            <li>Make sure the playlist is accessible to your Spotify account</li>
            <li>Check if the playlist is a Blend/collaborative playlist</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
