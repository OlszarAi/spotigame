import NextAuth from "next-auth"
import SpotifyProvider from "next-auth/providers/spotify"

const scopes = [
  "user-read-email",
  "user-read-private",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(",")

const params = {
  scope: scopes,
}

const LOGIN_URL = `https://accounts.spotify.com/authorize?${new URLSearchParams(
  params
).toString()}`

const handler = NextAuth({
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: LOGIN_URL,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      return token
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken
      // @ts-ignore
      session.refreshToken = token.refreshToken
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})

export { handler as GET, handler as POST }
