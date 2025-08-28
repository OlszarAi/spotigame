import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { findLobbyByIdOrCode } from '@/lib/lobby-utils'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lobby = await findLobbyByIdOrCode(params.id, {
      host: true,
      members: {
        include: {
          user: true
        }
      }
    })

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 })
    }

    return NextResponse.json(lobby)
  } catch (error) {
    console.error('Error fetching lobby:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
