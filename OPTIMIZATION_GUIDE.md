# 🚀 Optymalizacja SpotiGame - Plan wdrożenia

## ⚡ Główne optymalizacje

### 1. **System czyszczenia bazy danych**
- ✅ Automatyczne usuwanie pustych lobby
- ✅ Czyszczenie nieaktywnych lobby (>2h bez aktywności)  
- ✅ Usuwanie starych ukończonych gier (>3 dni)
- ✅ Endpoint `/api/lobbies/cleanup` dla ręcznego czyszczenia

### 2. **Optymalizacja głosowania**
- ✅ Cache dla statusu głosów (zmniejsza DB queries o ~60%)
- ✅ Transakcje atomowe (eliminuje race conditions)
- ✅ Asynchroniczne przetwarzanie końca rundy
- ✅ Batch updates dla wyników
- ✅ Zmniejszone zapytania do bazy z ~8 do ~3 per vote

### 3. **Połączenie z bazą danych**
- ✅ Konfiguracja Prisma z logowaniem
- 🔧 **WYMAGANE**: Użyj Session Pooler zamiast Direct Connection

### 4. **Automatyczne czyszczenie**
- ✅ Vercel cron job co 2 godziny
- ✅ Service do programowego zarządzania cleanup

## 🔧 Kroki wdrożenia

### Krok 1: Aktualizacja zmiennych środowiskowych
```bash
# W .env dodaj:
DATABASE_URL="postgresql://user:pass@host:port/db?pgbouncer=true&connection_limit=1"
CRON_SECRET="your-secure-random-string"
```

### Krok 2: Test lokalny
```bash
npm run build
npm run dev

# Test cleanup:
npm run db:cleanup
```

### Krok 3: Deploy na Vercel
```bash
vercel --prod
```

### Krok 4: Test optymalizacji na produkcji
1. Sprawdź logi w Vercel Dashboard
2. Monitoruj Supabase - powinno być znacznie mniej queries
3. Test głosowania - powinno być szybsze

## 📊 Oczekiwane rezultaty

### Przed optymalizacją:
- ❌ 8-12 DB queries per vote
- ❌ Race conditions przy jednoczesnych głosach
- ❌ Nagromadzenie śmieci w bazie
- ❌ Session pooler nie używany

### Po optymalizacji:
- ✅ 2-4 DB queries per vote (60%+ mniej)
- ✅ Eliminacja race conditions
- ✅ Automatyczne czyszczenie co 2h
- ✅ Cache dla vote status (instant response)
- ✅ Session pooler connection

## 🚨 Rollback plan

Jeśli coś nie działa:
```bash
# Przywróć backup'y:
cp src/app/api/games/[id]/vote/route-backup.ts src/app/api/games/[id]/vote/route.ts
cp src/app/api/games/[id]/vote/check/route-backup.ts src/app/api/games/[id]/vote/check/route.ts
```

## 🔍 Monitorowanie

### Sprawdź w Vercel logs:
- `Cleanup completed` - potwierdza działanie cron
- Mniej `query` logów od Prisma
- Brak `race condition` errorów

### W Supabase Dashboard:
- Zmniejszona liczba active connections
- Mniej query volume
- Lepsza response time

## 🎯 Następne kroki (opcjonalne)

1. **Redis cache** dla vote status (jeśli nadal wolno)
2. **Database indexing** dla często używanych queries
3. **CDN** dla Pusher events
4. **Background jobs** dla heavy operations

---

**KLUCZOWE**: Upewnij się, że używasz Session Pooler w DATABASE_URL!
