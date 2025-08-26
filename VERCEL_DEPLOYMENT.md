# 🚀 Wdrożenie SpotiGame na Vercel

## Przygotowanie do wdrożenia

### 1. Inicjalizacja repozytorium Git

```bash
# Jeśli jeszcze nie masz repozytorium Git
git init
git add .
git commit -m "Initial commit: SpotiGame app"

# Utwórz repozytorium na GitHub i dodaj remote
git remote add origin https://github.com/yourusername/spotigame.git
git push -u origin main
```

### 2. Konfiguracja Spotify App

1. Idź do [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Utwórz nową aplikację lub edytuj istniejącą
3. **WAŻNE**: Dodaj nowy Redirect URI dla produkcji:
   - `https://yourdomain.vercel.app/api/auth/callback/spotify`
   - Zastąp `yourdomain` rzeczywistą nazwą Twojej aplikacji Vercel

### 3. Wdrożenie na Vercel

#### Opcja A: Przez stronę internetową Vercel
1. Idź na [vercel.com](https://vercel.com)
2. Zaloguj się lub zarejestruj konto
3. Kliknij "New Project"
4. Importuj swoje repozytorium GitHub
5. Skonfiguruj zmienne środowiskowe (patrz poniżej)
6. Kliknij "Deploy"

#### Opcja B: Przez CLI Vercel
```bash
# Zainstaluj Vercel CLI
npm i -g vercel

# Zaloguj się
vercel login

# Wdróż projekt
vercel

# Podczas pierwszego wdrożenia odpowiedz na pytania:
# ? Set up and deploy "~/spotigame"? [Y/n] y
# ? Which scope do you want to deploy to? [Your username]
# ? Link to existing project? [y/N] n
# ? What's your project's name? spotigame
# ? In which directory is your code located? ./
```

### 4. Konfiguracja zmiennych środowiskowych

W panelu Vercel (Settings → Environment Variables) dodaj:

```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXTAUTH_URL=https://yourdomain.vercel.app
NEXTAUTH_SECRET=your_generated_secret
```

**Generowanie NEXTAUTH_SECRET:**
```bash
openssl rand -base64 32
```

### 5. Aktualizacja konfiguracji Spotify

Po wdrożeniu, zaktualizuj Redirect URI w aplikacji Spotify:
- Dodaj: `https://yourdomain.vercel.app/api/auth/callback/spotify`
- Gdzie `yourdomain` to rzeczywista nazwa Twojej aplikacji na Vercel

### 6. Testowanie

1. Otwórz `https://yourdomain.vercel.app`
2. Sprawdź czy logowanie Spotify działa
3. Przetestuj tworzenie i dołączanie do lobby

## ⚠️ Ważne uwagi dotyczące Vercel

### Ograniczenia Socket.io na Vercel

Vercel ma ograniczenia dotyczące WebSockets i długotrwałych połączeń. Current implementacja używa:
- **Development**: Custom server z Socket.io (`npm run dev:custom`)
- **Production**: Standardowy Next.js z fallback API (`npm run dev`, `npm start`)

### Alternatywne rozwiązania dla real-time

Jeśli potrzebujesz pełnej funkcjonalności real-time na Vercel, rozważ:

1. **Pusher** (zewnętrzny serwis WebSocket)
2. **Ably** (real-time messaging)
3. **Supabase Realtime** (PostgreSQL + real-time)
4. **Deploy na Railway/Render** (obsługują custom servers)

### Migracja na Railway (opcjonalnie)

Jeśli chcesz pełną funkcjonalność Socket.io:

```bash
# Zainstaluj Railway CLI
npm install -g @railway/cli

# Zaloguj się
railway login

# Wdróż
railway deploy
```

## 📝 Checklist wdrożenia

- [ ] Repozytorium Git utworzone i wypchane
- [ ] Spotify app skonfigurowana z poprawnym redirect URI
- [ ] Projekt wdrożony na Vercel
- [ ] Zmienne środowiskowe ustawione
- [ ] NEXTAUTH_URL zaktualizowane do domeny produkcji
- [ ] Spotify redirect URI zaktualizowane
- [ ] Aplikacja przetestowana w produkcji

## 🔧 Troubleshooting

### Błąd 401 przy logowaniu Spotify
- Sprawdź czy SPOTIFY_CLIENT_ID i SPOTIFY_CLIENT_SECRET są poprawne
- Zweryfikuj redirect URI w aplikacji Spotify

### Błąd NextAuth
- Sprawdź czy NEXTAUTH_URL jest poprawne (https://yourdomain.vercel.app)
- Zweryfikuj czy NEXTAUTH_SECRET jest ustawione

### Problemy z real-time funkcjonalnością
- Na Vercel funkcjonalność real-time jest ograniczona
- Rozważ użycie zewnętrznych serwisów lub migrację na Railway
