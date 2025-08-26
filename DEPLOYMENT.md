# Deployment Checklist dla Vercel 🚀

## Pre-deployment Checklist

### 1. Spotify App Configuration
- [ ] Utwórz aplikację w [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [ ] Dodaj redirect URIs:
  - Development: `http://localhost:3000/api/auth/callback/spotify`
  - Production: `https://your-domain.vercel.app/api/auth/callback/spotify`
- [ ] Skopiuj Client ID i Client Secret

### 2. Environment Variables
- [ ] Przygotuj następujące zmienne środowiskowe dla Vercel:
  ```
  NEXTAUTH_URL=https://your-domain.vercel.app
  NEXTAUTH_SECRET=your-super-secret-key
  SPOTIFY_CLIENT_ID=your-spotify-client-id
  SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
  ```

### 3. Repository Setup
- [ ] Wypchnij kod do GitHub repository
- [ ] Upewnij się, że .env.local jest w .gitignore
- [ ] Dodaj .env.example do repository

## Deployment Steps

### Option 1: Automatic Deployment (Recommended)

1. **Connect to Vercel**
   - Idź na [vercel.com](https://vercel.com)
   - Zaloguj się przez GitHub
   - Import repository

2. **Configure Environment Variables**
   - W Vercel dashboard → Settings → Environment Variables
   - Dodaj wszystkie wymagane zmienne
   - Ustaw je dla Production, Preview i Development

3. **Deploy**
   - Vercel automatycznie zbuduje i wdroży aplikację
   - Po deployment zaktualizuj Spotify redirect URI

### Option 2: Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## Post-deployment Tasks

### 1. Update Spotify App
- [ ] Zaktualizuj redirect URI w Spotify dashboard
- [ ] Przetestuj logowanie Spotify w produkcji

### 2. Test Core Features
- [ ] Logowanie
- [ ] Tworzenie lobby
- [ ] Dołączanie do lobby
- [ ] Socket.IO connection (może wymagać dodatkowej konfiguracji)

### 3. Performance Optimization
- [ ] Sprawdź Core Web Vitals w Vercel Analytics
- [ ] Włącz Vercel Speed Insights (opcjonalne)

## Known Issues & Solutions

### Socket.IO on Vercel
Vercel Serverless Functions mają ograniczenia dla długotrwałych connections. Opcje:

1. **Use Vercel Edge Functions** (eksperymentalne)
2. **External Socket.IO service** (Railway, Heroku)
3. **Replace with Vercel's real-time features** (webhooks, SSE)

### Environment Variables
- Wszystkie zmienne zaczynające się od `NEXT_PUBLIC_` są dostępne w browser
- Prywatne klucze API nie powinny mieć tego prefiksu

## Monitoring & Maintenance

- [ ] Ustaw Vercel Analytics
- [ ] Monitoruj logi w Vercel dashboard
- [ ] Regularnie aktualizuj dependencies

## Support

Jeśli napotkasz problemy:
1. Sprawdź logi w Vercel dashboard
2. Przeczytaj dokumentację Vercel/Next.js
3. GitHub Issues tego projektu
