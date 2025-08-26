#!/bin/bash

# SpotiGame Development Setup Script

echo "🎵 SpotiGame Development Setup 🎮"
echo "================================="

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local file not found!"
    echo ""
    echo "Please create .env.local with the following variables:"
    echo ""
    echo "NEXTAUTH_URL=http://localhost:3000"
    echo "NEXTAUTH_SECRET=your-random-secret-key"
    echo "SPOTIFY_CLIENT_ID=your-spotify-client-id"
    echo "SPOTIFY_CLIENT_SECRET=your-spotify-client-secret"
    echo ""
    echo "Get your Spotify credentials from: https://developer.spotify.com/dashboard"
    exit 1
fi

echo "✅ Environment file found"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Dependencies ready"

# Start the development server
echo "🚀 Starting development server..."
echo ""
echo "Your SpotiGame will be available at:"
echo "🌐 http://localhost:3000"
echo ""
echo "Setup checklist:"
echo "1. ✅ Next.js app created"
echo "2. ✅ Dependencies installed"
echo "3. ⚙️  Configure Spotify API credentials in .env.local"
echo "4. 🎵 Create a Spotify Blend playlist with friends"
echo "5. 🎮 Start playing!"
echo ""

npm run dev
