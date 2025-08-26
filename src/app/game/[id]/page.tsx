'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Props {
  params: Promise<{ id: string }>
}

export default function GamePage({ params }: Props) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [lobbyId, setLobbyId] = useState<string | null>(null)

  // Resolve params
  useEffect(() => {
    params.then(resolvedParams => {
      setLobbyId(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    if (status === 'loading' || !lobbyId) return
    
    if (!session) {
      router.push('/login')
      return
    }

    // For now, redirect back to lobby since game implementation needs real-time features
    // that require significant restructuring for Vercel compatibility
    // TODO: Implement proper game functionality with polling-based updates
    router.push(`/lobby/${lobbyId}`)
  }, [session, status, lobbyId, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1db954] mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading game...</div>
        </div>
      </div>
    )
  }

  return null
}
