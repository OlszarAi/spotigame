# SpotiGame 🎵

A multiplayer web game where players guess which user owns each Spotify track. Built with Next.js 13+, Supabase, and the Spotify Web API.

## Features

- **Spotify Authentication**: Login with your Spotify account
- **Real-time Lobbies**: Create and join game lobbies with live updates
- **Track Guessing Game**: Listen to 30-second snippets and guess the owner
- **Multiplayer Support**: Play with friends using shareable lobby links
- **Customizable Settings**: Configure rounds, snippet duration, and track info visibility
- **Live Audio Playback**: Built-in audio player with controls
- **Responsive Design**: Spotify-themed dark UI that works on all devices

## Tech Stack

- **Frontend**: Next.js 13+ (App Router), TypeScript, TailwindCSS
- **Authentication**: NextAuth.js with Spotify provider
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Audio**: Web Audio API with custom player
- **Music API**: Spotify Web API (top tracks, preview URLs)
- **Deployment**: Vercel-ready serverless functions

## Prerequisites

Before setting up the project, you'll need:

1. **Spotify Developer Account**: Register at [Spotify for Developers](https://developer.spotify.com)
2. **Supabase Account**: Create a project at [Supabase](https://supabase.com)
3. **Node.js**: Version 18+ recommended

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd spotigame
npm install
```

### 2. Spotify App Configuration

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add these redirect URIs:
   - `http://localhost:3000/api/auth/callback/spotify` (development)
   - `https://your-domain.vercel.app/api/auth/callback/spotify` (production)
4. Note down your **Client ID** and **Client Secret**

### 3. Supabase Setup

1. Create a new project at [Supabase](https://supabase.com)
2. Go to Settings → API to get your:
   - Project URL
   - Anon public key
   - Service role key (keep this secret!)
3. In the SQL Editor, run the schema from `supabase/schema.sql`

### 4. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key

# Spotify OAuth
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## How to Play

1. **Login**: Authenticate with your Spotify account
2. **Create/Join Lobby**: Create a new lobby or join via shareable link
3. **Configure Settings**: Set number of rounds, snippet duration, etc.
4. **Wait for Players**: All players must mark themselves as "Ready"
5. **Start Game**: The lobby creator starts the game
6. **Listen & Guess**: Hear track snippets and guess which player owns each song
7. **Score Points**: Earn points for correct guesses
8. **View Results**: See final leaderboard after all rounds

## Game Mechanics

- **Track Source**: Each player's top 100 tracks from the last month
- **Track Pool**: All tracks are merged and randomly selected each round
- **Preview Requirement**: Only tracks with 30-second previews are used
- **Scoring**: 100 points per correct guess
- **Real-time Updates**: Live lobby updates using Supabase Realtime

## API Routes

- `POST /api/lobbies` - Create a new lobby
- `GET /api/lobbies` - List active lobbies
- `GET /api/lobbies/[id]` - Get lobby details
- `POST /api/lobbies/[id]` - Join a lobby
- `PATCH /api/lobbies/[id]` - Update lobby settings
- `POST /api/lobbies/[id]/start` - Start the game
- `GET/POST /api/lobbies/[id]/round` - Manage game rounds
- `POST /api/lobbies/[id]/guess` - Submit guesses

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Update Spotify redirect URI with your Vercel domain
5. Deploy!

### Environment Variables for Production

Set these in Vercel dashboard:

```env
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-production-secret
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Database Schema

The app uses these main tables:

- **lobbies**: Game lobby information and settings
- **lobby_players**: Players in each lobby
- **game_sessions**: Active game state and track pools
- **player_scores**: Individual player scores and round history
- **round_guesses**: Player guesses for each round

See `supabase/schema.sql` for the complete schema.

## Troubleshooting

### Common Issues

1. **"No preview available"**: Some tracks don't have 30-second previews
2. **Authentication errors**: Check Spotify redirect URIs
3. **Database errors**: Verify Supabase connection and schema
4. **Audio not playing**: Browser audio policies require user interaction

### Development Tips

- Use browser dev tools to debug audio issues
- Check Network tab for API errors
- Monitor Supabase logs for database issues
- Test with multiple browser tabs for multiplayer simulation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Credits

- Built with [Next.js](https://nextjs.org)
- Authentication by [NextAuth.js](https://next-auth.js.org)
- Database and real-time by [Supabase](https://supabase.com)
- Music data from [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- Icons by [Lucide React](https://lucide.dev)

---

Enjoy playing SpotiGame! 🎵🎮
