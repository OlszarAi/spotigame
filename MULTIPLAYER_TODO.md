# SpotiGame - Plan Implementacji Multi-Player

## ✅ Co już działa (Single Player Demo):
- ✅ Pobieranie top tracks właściciela lobby
- ✅ Podstawowa rozgrywka 
- ✅ UI dostosowane do demo mode
- ✅ Kompilacja bez błędów

## 🚧 TODO: Multi-Player Implementation

### 1. System zbierania access tokens od wszystkich graczy
**Problem:** Obecnie mamy tylko access token właściciela lobby. Potrzebujemy tokenów od wszystkich graczy.

**Rozwiązanie:**
- [ ] Dodać endpoint do przechowywania user tokens w gameStore
- [ ] Każdy gracz po dołączeniu do lobby musi autoryzować dostęp do swoich top tracks
- [ ] Przechowywać tokeny tymczasowo w pamięci (lub Redis)

### 2. Zabezpieczenia tokenów
- [ ] Implementować refresh token logic
- [ ] Timeout dla nieaktywnych tokenów
- [ ] Proper error handling gdy token wygaśnie

### 3. UI dla multi-player
- [ ] Status zbierania tokenów od graczy
- [ ] Informacja o tym, kto już autoryzował dostęp
- [ ] "Ready" system przed startem gry

### 4. Algorytm zbierania tracks
- [ ] Zbierać równomiernie od wszystkich graczy 
- [ ] Handling przypadków gdy gracz ma mało top tracks
- [ ] Deduplikacja identycznych utworów

### 5. Improved game logic
- [ ] Proper scoring system 
- [ ] Round-by-round results
- [ ] Leaderboard z punktami
- [ ] Game history

## 🔧 Technical Debt
- [ ] Lepsze error handling w SpotifyService
- [ ] Typescript types dla wszystkich response'ów
- [ ] Unit tests
- [ ] Rate limiting dla Spotify API calls
- [ ] Logging system

## 🎯 Priority Order:
1. **Token collection system** (highest priority)
2. **Multi-player UI flow**
3. **Improved game mechanics**
4. **Security & performance**
5. **Testing & monitoring**

## 🚀 Quick Wins (można zrobić teraz):
- [ ] Lepsze error messages
- [ ] Loading states
- [ ] Better responsive design
- [ ] Sound effects/animations
- [ ] Score persistence
