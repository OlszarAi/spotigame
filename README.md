# 🎵 SpotiGame - Spotify Music Guessing Game

A fun multiplayer game where players guess whose Spotify music is playing! Built with Next.js, Socket.io, and the Spotify Web API.

## 🎮 How to Play

1. **Login** with your Spotify account
2. **Create a lobby** or **join an existing one** with a lobby ID
3. **Configure game settings** (rounds, song duration, show track info)
4. **Wait for players** to join and start the game
5. **Fetch everyone's top tracks** from Spotify (last month's most played)
6. **Listen to song snippets** and guess which player they belong to
7. **Score points** for correct guesses and compete for the highest score!

## 🚀 Setup Instructions

### Prerequisites

- Node.js 18+ installed
- A Spotify Developer account
- Spotify Premium account (recommended for better audio previews)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd spotigame
npm install
```

### 2. Set Up Spotify API

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
4. Note your Client ID and Client Secret

### 3. Environment Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Get these from Spotify Developer Dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Optional Socket.io port
SOCKET_PORT=3001
```

To generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

Visit `http://localhost:3000` and enjoy playing!

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14+ with App Router, React, TypeScript
- **Styling**: TailwindCSS
- **Authentication**: NextAuth.js with Spotify provider
- **Real-time Communication**: Socket.io
- **API Integration**: Spotify Web API via spotify-web-api-node

### Key Features

- 🎵 **Spotify Integration**: Fetches users' top 100 tracks from the last month
- 🔄 **Real-time Gameplay**: WebSocket-based lobby and game state management
- 🎯 **Lobby System**: Create/join lobbies with shareable links
- ⚙️ **Configurable Settings**: Number of rounds, song duration, track info visibility
- 🏆 **Scoring System**: Points for correct guesses with live leaderboard
- 📱 **Responsive Design**: Works on desktop and mobile devices

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # NextAuth configuration
│   │   ├── lobby/         # Lobby management endpoints
│   │   └── spotify/       # Spotify API integration
│   ├── login/             # Login page
│   ├── lobby/[id]/        # Lobby waiting room
│   ├── game/[id]/         # Main game interface
│   └── layout.tsx         # Root layout with providers
├── components/            # Reusable React components
├── lib/                   # Utility functions and services
│   ├── lobby-manager.ts   # In-memory lobby state management
│   ├── socket-server.ts   # Socket.io server setup
│   └── spotify.ts         # Spotify API wrapper
└── types/                 # TypeScript type definitions
```

## 🎯 Game Flow

1. **Authentication**: Users login via Spotify OAuth
2. **Lobby Creation**: Creator sets game parameters and gets shareable lobby ID
3. **Player Joining**: Other players join via lobby ID or link
4. **Track Fetching**: Each player's top 100 tracks are fetched from Spotify
5. **Game Rounds**: Random tracks are played, players guess the owner
6. **Scoring**: Correct guesses earn points, live leaderboard updates
7. **Results**: Final scoreboard with winner celebration

## 🔧 Configuration Options

### Lobby Settings

- **Number of Rounds**: 5, 10, 15, or 20 rounds
- **Song Duration**: 15, 30, 45, or 60 seconds per song
- **Show Track Info**: Toggle to show/hide song title and artist during gameplay

### Spotify Integration

- Fetches up to 100 tracks per user from the "short_term" time range (last ~4 weeks)
- Only includes tracks with preview URLs (30-second snippets)
- Requires users to have sufficient listening history

## 🐛 Troubleshooting

### Common Issues

1. **"No tracks found"**: User needs more Spotify listening history or Premium account
2. **Audio not playing**: Browser autoplay restrictions - user interaction required
3. **Socket connection issues**: Check firewall settings and port availability
4. **Authentication errors**: Verify Spotify app configuration and redirect URIs

### Development Tips

- Use browser dev tools to monitor WebSocket connections
- Check Network tab for API call failures
- Spotify Web API has rate limits - implement backoff if needed
- Test with multiple users in different browsers/incognito windows

## 📝 License

This project is for educational and entertainment purposes. Make sure to comply with Spotify's Developer Terms of Service when using their API.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🎵 Have Fun!

Enjoy discovering your friends' music taste and competing for the ultimate Spotify knowledge crown! 🏆
