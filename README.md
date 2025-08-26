# SpotiGame 🎵🎮

A fun multiplayer guessing game where players try to guess who added which track to a Spotify Blend playlist!

## 🎯 Game Concept

- **Create a lobby** with customizable settings (number of rounds, round duration)
- **Share the lobby link** with friends to invite them to play
- **Add a Spotify Blend playlist URL** to load track data
- **Listen to track previews** and guess which friend added each song
- **Earn points** for correct guesses and compete for the top spot!

## 🚀 Features

- **Spotify Authentication** using NextAuth.js
- **Real-time multiplayer** with live lobby updates
- **Customizable game settings** (rounds, duration, playlist)
- **Audio playback** of Spotify track previews
- **Score tracking** and final leaderboard
- **Responsive design** with TailwindCSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: TailwindCSS
- **Authentication**: NextAuth.js
- **Real-time**: Socket.IO
- **Music API**: Spotify Web API
- **Deployment**: Vercel

## 📋 Prerequisites

Before running the project, make sure you have:

- Node.js 18+ installed
- A Spotify Developer account
- Access to Spotify Blend playlists

## 🔧 Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YourUsername/spotigame.git
   cd spotigame
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - `NEXTAUTH_SECRET`: Generate a random secret key
   - `SPOTIFY_CLIENT_ID`: From your Spotify app dashboard
   - `SPOTIFY_CLIENT_SECRET`: From your Spotify app dashboard

4. **Configure Spotify App**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add redirect URIs:
     - `http://localhost:3000/api/auth/callback/spotify` (development)
     - `https://your-domain.vercel.app/api/auth/callback/spotify` (production)

5. **Run the development server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment on Vercel

### Automatic Deployment

1. **Connect your GitHub repository** to Vercel
2. **Configure environment variables** in Vercel dashboard:
   - `NEXTAUTH_URL`: Your production domain (e.g., `https://your-app.vercel.app`)
   - `NEXTAUTH_SECRET`: Same secret as in development
   - `SPOTIFY_CLIENT_ID`: Your Spotify client ID
   - `SPOTIFY_CLIENT_SECRET`: Your Spotify client secret

3. **Deploy** - Vercel will automatically build and deploy your app

### Manual Deployment

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

### Environment Variables for Production

Make sure to set these environment variables in your Vercel dashboard:

```bash
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your-super-secret-key
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

## 📁 Project Structure

```
spotigame/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── game/           # Game pages
│   │   └── login/          # Authentication
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and stores
│   └── types/              # TypeScript definitions
├── public/                 # Static assets
└── pages/api/              # Legacy API (Socket.IO)
```

## 🎮 How to Play

1. **Login** with your Spotify account
2. **Create a lobby** or join an existing one
3. **Add a Spotify Blend playlist** URL
4. **Wait for other players** to join
5. **Start the game** and listen to track previews
6. **Guess** which friend added each song
7. **View results** and compete for high scores!

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript check

### Socket.IO Development

The project uses Socket.IO for real-time features. In development, the Socket.IO server runs alongside Next.js. In production on Vercel, consider using:

- Vercel's Edge Functions for real-time features
- External Socket.IO service (Railway, Heroku, etc.)
- WebSocket alternatives compatible with serverless

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

1. **Spotify Authentication Fails**
   - Check your client ID and secret
   - Verify redirect URIs in Spotify dashboard
   - Ensure NEXTAUTH_URL is correctly set

2. **Socket.IO Connection Issues**
   - In production, Socket.IO might need external hosting
   - Consider using Vercel's WebSocket alternatives

3. **Build Errors**
   - Run `npm run type-check` to find TypeScript errors
   - Check all environment variables are set

### Support

If you encounter any issues, please:
1. Check the troubleshooting section above
2. Search existing GitHub issues
3. Create a new issue with detailed description

## 🛠️ Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **NextAuth.js** for Spotify OAuth
- **Spotify Web API** for playlist data
- **TailwindCSS** for styling
- **Real-time updates** with polling (WebSocket-ready architecture)

## 📋 Prerequisites

1. **Node.js** (v18 or later)
2. **Spotify Developer Account** and app credentials
3. **npm** or **yarn** package manager

## ⚙️ Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd spotigame
npm install
```

### 2. Set Up Spotify Developer App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add these redirect URIs:
   - `http://localhost:3000/api/auth/callback/spotify`
   - `https://yourdomain.com/api/auth/callback/spotify` (for production)
4. Note your **Client ID** and **Client Secret**

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-key-here

# Spotify API Configuration
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
```

**Important:** Generate a secure random string for `NEXTAUTH_SECRET`. You can use:
```bash
openssl rand -base64 32
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🎮 How to Play

### For Lobby Owners:
1. **Sign in** with your Spotify account
2. **Create a new game** with your preferred settings
3. **Share the lobby link** with friends
4. **Add your Spotify Blend playlist URL**
5. **Load the playlist** to fetch track data
6. **Start the game** when everyone has joined

### For Players:
1. **Join via the shared link** and sign in with Spotify
2. **Wait for the game to start**
3. **Listen to track previews** during each round
4. **Guess who added the track** from the available options
5. **Submit your guess** before time runs out
6. **Check the final leaderboard** when the game ends!

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth configuration
│   │   ├── lobby/                  # Lobby management API
│   │   └── game/                   # Game logic API
│   ├── game/[lobbyId]/             # Game room page
│   ├── login/                      # Login page
│   └── page.tsx                    # Home page
├── hooks/
│   └── useGameState.ts             # Game state management hook
├── lib/
│   ├── spotify.ts                  # Spotify API service
│   ├── socket.ts                   # Real-time communication
│   └── gameStore.ts                # Game data management
└── types/
    └── game.ts                     # TypeScript interfaces
```

## 🔧 Key Components

### Spotify Integration
- **OAuth authentication** with proper scopes
- **Playlist fetching** with track and contributor data
- **Audio preview playback** for guessing rounds

### Game Logic
- **Lobby management** with real-time updates
- **Round-based gameplay** with timers
- **Score calculation** and leaderboard tracking
- **Game state synchronization** across players

### Real-time Features
- **Live lobby updates** when players join/leave
- **Game state synchronization** during play
- **Automatic round progression** with timers

## 🌟 Spotify Blend Playlists

This game works best with **Spotify Blend playlists**, which show who added each track. To create a Blend playlist:

1. Open Spotify and go to "Made for You"
2. Look for "Blend" playlists with friends
3. Create a new Blend if you don't have one
4. Copy the playlist share URL for the game

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Update Spotify app redirect URIs with your deployed URL
5. Deploy!

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- Heroku
- AWS Amplify

## 🔮 Future Enhancements

- **WebSocket integration** for true real-time gameplay
- **Database persistence** for game history and stats
- **Custom scoring systems** and game modes
- **Team play** and tournament brackets
- **Mobile app** with React Native
- **Voice chat** integration during games

## 🐛 Troubleshooting

### Common Issues

**"Playlist not loading"**
- Ensure the playlist URL is from a Spotify Blend playlist
- Check that your Spotify API credentials are correct
- Verify the playlist is public or collaborative

**"Authentication errors"**
- Confirm your Spotify app redirect URIs are correct
- Check that NEXTAUTH_URL matches your domain
- Ensure NEXTAUTH_SECRET is set and secure

**"Real-time updates not working"**
- Currently using polling - players should refresh if needed
- WebSocket implementation coming in future updates

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Have fun playing SpotiGame!** 🎵🎮
