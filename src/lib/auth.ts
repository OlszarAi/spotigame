import SpotifyProvider from 'next-auth/providers/spotify'
// import { SupabaseAdapter } from '@auth/supabase-adapter'

// Spotify scopes needed for the game
const SPOTIFY_SCOPES = [
  'user-read-email',
  'user-read-private',
  'user-top-read',
].join(' ')

export const authOptions = {
  // DISABLE PROBLEMATIC SUPABASE ADAPTER - use custom solution
  // adapter: SupabaseAdapter({
  //   url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //   secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  // }),
  trustHost: true,
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user, account, profile }: any) {
      // Custom logic to save user to Supabase when they sign in
      if (account?.provider === 'spotify' && user.email) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )

          // Insert or update user in our custom users table
          await supabase
            .from('users')
            .upsert({
              id: user.id || user.email,
              email: user.email,
              name: user.name,
              image: user.image,
              updated_at: new Date().toISOString()
            })

          console.log('User saved to Supabase successfully')
        } catch (error) {
          console.error('Error saving user to Supabase:', error)
          // Don't block login if database save fails
        }
      }
      return true
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, user }: any) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.userId = user?.id || user?.email || token.sub
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.expiresAt = token.expiresAt as number
      session.user.id = token.userId as string || token.sub as string
      
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  debug: true,
  logger: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error(code: any, metadata: any) {
      console.error('NextAuth Error:', code, metadata)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    warn(code: any) {
      console.warn('NextAuth Warning:', code)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    debug(code: any, metadata: any) {
      console.log('NextAuth Debug:', code, metadata)
    }
  },
}
