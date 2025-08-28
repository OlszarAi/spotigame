# SpotiGame - Music Guessing Game

## 🏗️ Architektura

### Tech Stack
- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Pusher (działa z Vercel, w przeciwieństwie do Socket.io)
- **Authentication**: NextAuth.js z Spotify Provider
- **Deployment**: Vercel

### Struktura Bazy Danych

```sql
User (użytkownicy)
├── Account (konta OAuth)
├── Session (sesje)
├── LobbyMember (członkowie lobby)
├── GameParticipant (uczestnicy gry)
└── Vote (głosy)

Lobby (lobby gier)
├── LobbyMember (członkowie)
└── Game (gry)

Game (gry)
├── GameParticipant (uczestnicy)
└── Round (rundy)

Round (rundy gry)
└── Vote (głosy)
```

## 🚀 Setup

### 1. Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` i wypełnij:

```bash
cp .env.example .env.local
```

#### Database (Supabase)
```
DATABASE_URL="postgresql://user:pass@host:port/db"
```

#### NextAuth
```
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="random-secret-string"
```

#### Spotify API
1. Idź do [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Utwórz nową aplikację
3. Dodaj redirect URI: `http://localhost:3000/api/auth/callback/spotify`
4. Skopiuj Client ID i Client Secret

```
SPOTIFY_CLIENT_ID="your-client-id"
SPOTIFY_CLIENT_SECRET="your-client-secret"
```

#### Pusher (Real-time)
1. Załóż konto na [Pusher](https://pusher.com/)
2. Utwórz nowy app
3. Skopiuj credentials

```
NEXT_PUBLIC_PUSHER_APP_ID="your-app-id"
NEXT_PUBLIC_PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
NEXT_PUBLIC_PUSHER_CLUSTER="your-cluster"
```

### 2. Instalacja

```bash
npm install
```

### 3. Baza danych

```bash
# Wygeneruj Prisma client
npx prisma generate

# Prześlij schema do bazy (jeśli baza jest pusta)
npx prisma db push

# Opcjonalnie: otwórz Prisma Studio
npx prisma studio
```

### 4. Uruchomienie

```bash
npm run dev
```

Aplikacja będzie dostępna na http://localhost:3000

## 🎮 Jak działa gra

### Flow użytkownika

1. **Logowanie**: Użytkownik loguje się przez Spotify
2. **Dashboard**: Może utworzyć lobby lub dołączyć do istniejącego
3. **Lobby**: 
   - Host widzi wszystkich graczy
   - Każdy gracz może zaznaczyć "Ready"
   - Host może rozpocząć grę gdy wszyscy są gotowi
4. **Gra**:
   - System pobiera top utwory od każdego gracza
   - Losuje utwory na każdą rundę
   - Każda runda: odtwarzanie utworu + głosowanie na właściciela
   - Punkty za poprawne odpowiedzi
5. **Wyniki**: Finalne wyniki i zwycięzca

### Mechanika Real-time

- **Pusher channels** dla każdego lobby i gry
- Synchronizacja stanów: ready status, start gry, rundy, głosy
- Wszyscy gracze widzą te same zmiany w tym samym czasie

## 📁 Struktura projektu

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Strona główna (login)
│   ├── dashboard/         # Dashboard użytkownika
│   ├── lobby/[id]/        # Strona lobby
│   ├── game/[id]/         # Strona gry
│   └── api/               # API endpoints
│       ├── auth/          # NextAuth
│       ├── lobbies/       # CRUD lobby
│       └── games/         # Logika gry
├── components/            # Komponenty React
├── lib/                   # Utilities
│   ├── auth.ts           # Konfiguracja NextAuth
│   ├── prisma.ts         # Prisma client
│   ├── pusher.ts         # Pusher config
│   └── spotify.ts        # Spotify API
└── types/                # TypeScript definitions
```

## 🔧 API Endpoints

### Lobbies
- `POST /api/lobbies` - Tworzenie lobby
- `GET /api/lobbies` - Lista aktywnych lobby
- `GET /api/lobbies/[id]` - Szczegóły lobby
- `POST /api/lobbies/[id]/ready` - Toggle ready status
- `POST /api/lobbies/[id]/start` - Start gry
- `POST /api/lobbies/[id]/join` - Dołączenie do lobby
- `POST /api/lobbies/[id]/leave` - Opuszczenie lobby

### Games
- `GET /api/games/[id]` - Stan gry
- `POST /api/games/[id]/vote` - Głosowanie w rundzie
- `GET /api/games/[id]/round` - Aktualna runda

## 🚀 Deployment na Vercel

1. **Push do GitHub**
2. **Połącz z Vercel**
3. **Ustaw environment variables w Vercel dashboard**
4. **Deploy!**

### Ważne dla Vercel:
- Pusher działa świetnie z Vercel (w przeciwieństwie do Socket.io)
- Edge Runtime może mieć problemy z niektórymi bibliotekami
- Sprawdź limity Vercel dla funkcji serverless

## 🎵 Spotify Integration

### Uprawnienia (Scopes)
- `user-read-email` - Email użytkownika
- `user-top-read` - Top utwory użytkownika
- `user-read-private` - Profil użytkownika

### Embed Player
- Używamy Spotify Web Playback SDK embed
- Działa bez dodatkowych uprawnień
- Automatyczne odtwarzanie (zależne od przeglądarki)

## 🔐 Bezpieczeństwo

- NextAuth.js zarządza sesjami
- Prisma chroni przed SQL injection
- Rate limiting przez Vercel
- CORS skonfigurowany przez Next.js
- Environment variables nie są eksponowane do klienta

## 📝 TODO dla dalszego rozwoju

- [ ] Rate limiting dla API
- [ ] Error boundaries w React
- [ ] Loading states dla wszystkich akcji
- [ ] Mobile responsive design
- [ ] Dodanie chat w lobby
- [ ] Statystyki gracza
- [ ] Historie gier
- [ ] Custom playlist dla gier
- [ ] Więcej trybów gry (Artyści)(różne długości utworów, różne źródła, top utwory roku itp)

## 🐛 Debugowanie

### Najczęstsze problemy:

1. **Spotify API errors**: Sprawdź czy access token jest ważny
2. **Pusher nie działa**: Sprawdź credentials i cluster
3. **Database errors**: Sprawdź connection string
4. **NextAuth errors**: Sprawdź NEXTAUTH_SECRET i NEXTAUTH_URL

### Logi:
```bash
# Sprawdź logi Vercel
vercel logs

# Local development
npm run dev
```