// Remove unused import
// import NextAuth from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      accessToken?: string
      refreshToken?: string
      username?: string
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    username?: string
    accessTokenExpires?: number
    error?: string
  }
}
