#!/bin/bash

echo "🎵 SpotiGame Setup Script"
echo "========================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not found"
    exit 1
fi

echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.example .env.local
    echo "✅ Created .env.local"
    echo ""
    echo "⚠️  IMPORTANT: You need to configure your environment variables!"
    echo ""
    echo "1. Create a Spotify app at: https://developer.spotify.com/dashboard"
    echo "   - Add redirect URI: http://localhost:3000/api/auth/callback/spotify"
    echo "   - Get your Client ID and Client Secret"
    echo ""
    echo "2. Create a Supabase project at: https://supabase.com"
    echo "   - Get your Project URL and API keys"
    echo "   - Run the SQL schema from supabase/schema.sql"
    echo ""
    echo "3. Edit .env.local with your actual values"
    echo ""
else
    echo "✅ .env.local already exists"
    echo ""
fi

# Check if Supabase schema needs to be set up
echo "🗄️  Database Setup"
echo "=================="
echo ""
echo "Don't forget to run the database schema!"
echo ""
echo "1. Go to your Supabase project dashboard"
echo "2. Navigate to the SQL Editor"
echo "3. Copy and run the contents of supabase/schema.sql"
echo ""
echo "This will create all necessary tables and functions."
echo ""

echo "🚀 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Configure your .env.local file with real values"
echo "2. Set up your Supabase database schema"
echo "3. Run: npm run dev"
echo "4. Open: http://localhost:3000"
echo ""
echo "For detailed instructions, see README.md"
echo ""
echo "Happy gaming! 🎮🎵"
