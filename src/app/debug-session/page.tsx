'use client'

import { useSession } from 'next-auth/react'

export default function DebugPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Session</h1>
      
      <div className="bg-gray-900 p-4 rounded-lg">
        <pre className="text-sm">
          {JSON.stringify(session, null, 2)}
        </pre>
      </div>

      <div className="mt-4 space-y-2">
        <div>Has session: {session ? '✅' : '❌'}</div>
        <div>Has user: {session?.user ? '✅' : '❌'}</div>
        <div>User email: {session?.user?.email || 'N/A'}</div>
        <div>Has accessToken: {(session as any)?.accessToken ? '✅' : '❌'}</div>
        <div>AccessToken length: {(session as any)?.accessToken?.length || 0}</div>
      </div>

      <div className="mt-4">
        <button 
          onClick={async () => {
            const response = await fetch('/api/player-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ lobbyId: 'test-lobby' }),
            })
            const data = await response.json()
            console.log('Test auth response:', data)
            alert(JSON.stringify(data, null, 2))
          }}
          className="bg-blue-600 px-4 py-2 rounded"
        >
          Test Authorization API
        </button>
      </div>
    </div>
  )
}
