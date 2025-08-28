import { NextAuthOptions } from 'next-auth'
import SpotifyProvider from 'next-auth/providers/spotify'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'

const scopes = [
  'user-read-email',
  'user-top-read',
  'user-read-private',
].join(' ')

const params = {
  scope: scopes,
}

const LOGIN_URL = 'https://accounts.spotify.com/authorize?' + new URLSearchParams(params).toString()

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: LOGIN_URL,
    }),
  ],
  debug: process.env.NODE_ENV === 'development',
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async session({ session, token, user }) {
      console.log('Session callback called:', { hasToken: !!token, hasUser: !!user })
      
      // Jeśli używamy database sessions, tokeny są w account
      if (user?.id) {
        try {
          // Pobierz konto Spotify dla tego użytkownika
          const account = await prisma.account.findFirst({
            where: {
              userId: user.id,
              provider: 'spotify'
            }
          })
          
          if (account?.access_token) {
            console.log('Found Spotify account with access token')
            session.user.accessToken = account.access_token
            session.user.refreshToken = account.refresh_token || undefined
            session.user.username = account.providerAccountId
          } else {
            console.log('No Spotify account found or no access token')
          }
        } catch (error) {
          console.error('Error fetching account:', error)
        }
      } else if (token?.accessToken) {
        // Fallback dla JWT strategy
        console.log('Using JWT token data')
        session.user.accessToken = token.accessToken as string
        session.user.refreshToken = token.refreshToken as string
        session.user.username = token.username as string
      }

      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}
