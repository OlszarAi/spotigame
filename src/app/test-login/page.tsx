'use client'

import { signIn, signOut, useSession } from 'next-auth/react'

export default function TestLoginPage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Test Login</h1>
      
      <div className="space-y-4">
        {session ? (
          <div>
            <p className="text-green-400">✅ Zalogowany jako: {session.user?.name}</p>
            <p className="text-sm text-gray-400">Email: {session.user?.email}</p>
            <button 
              onClick={() => signOut()}
              className="bg-red-600 px-4 py-2 rounded mt-2"
            >
              Wyloguj się
            </button>
          </div>
        ) : (
          <div>
            <p className="text-red-400">❌ Nie zalogowany</p>
            <button 
              onClick={() => signIn('spotify')}
              className="bg-green-600 px-4 py-2 rounded mt-2"
            >
              Zaloguj przez Spotify
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 bg-gray-900 p-4 rounded">
        <h3 className="font-bold mb-2">Debug info:</h3>
        <pre className="text-xs">
          Status: {status}
          {'\n'}
          NEXTAUTH_URL: {process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'undefined'}
        </pre>
      </div>
    </div>
  )
}
