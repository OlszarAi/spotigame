# Funkcjonalności Administratora Lobby

## Nowe Funkcjonalności

### 1. Ustawienia Liczby Rund i Graczy

Administrator lobby (host) może teraz ustawiać:

- **Maksymalną liczbę graczy** (2-12)
- **Liczbę rund w grze** (1-20)

### 2. Tworzenie Lobby z Niestandardowymi Ustawieniami

#### Dashboard - Quick Create vs Custom Settings
- **Quick Create**: Szybko tworzy lobby z domyślnymi ustawieniami (8 graczy, 5 rund)
- **Custom Settings**: Pozwala skonfigurować:
  - Nazwę lobby (opcjonalnie)
  - Maksymalną liczbę graczy
  - Liczbę rund

### 3. Edycja Ustawień w Lobby

#### Dla Hosta:
- Przycisk "Edit Settings" w sekcji Game Settings
- Formularz edycji z walidacją:
  - Nie można zmniejszyć max graczy poniżej obecnej liczby uczestników
  - Nie można edytować podczas trwającej gry
  - Limity: 2-12 graczy, 1-20 rund

#### Real-time Updates:
- Wszystkie zmiany są natychmiast synchronizowane między wszystkimi uczestnikami lobby
- Powiadomienia Pusher informują o zmianach ustawień

## API Endpoints

### PATCH `/api/lobbies/[id]`
Aktualizuje ustawienia lobby (tylko dla hosta)

**Request Body:**
```json
{
  "maxPlayers": 10,
  "roundCount": 7
}
```

**Responses:**
- `200`: Sukces - zwraca zaktualizowane lobby
- `400`: Błąd walidacji lub aktywna gra
- `403`: Brak uprawnień (nie jest hostem)
- `404`: Lobby nie znalezione

**Walidacja:**
- maxPlayers: 2-12, nie może być mniejsze niż obecna liczba członków
- roundCount: 1-20
- Nie można edytować podczas aktywnej gry

## Pusher Events

### `lobby-settings-updated`
Wysyłany gdy host aktualizuje ustawienia lobby

**Payload:**
```json
{
  "lobby": { /* zaktualizowane dane lobby */ },
  "changes": { /* zmienione pola */ }
}
```

## UI/UX Improvements

### Dashboard
- Dodano wybór między Quick Create a Custom Settings
- Formularz z polami do konfiguracji lobby
- Walidacja po stronie klienta

### Lobby Page
- Dynamiczny przycisk "Edit Settings" (tylko dla hosta)
- Inline edycja ustawień z anulowaniem
- Real-time updates dla wszystkich uczestników
- Informacja o obecnej liczbie graczy w formularzu

## Zabezpieczenia

1. **Autoryzacja**: Tylko host może modyfikować ustawienia
2. **Walidacja**: Sprawdzanie limitów po stronie serwera i klienta
3. **Stan Gry**: Blokada edycji podczas aktywnej gry
4. **Integralność**: Nie można zmniejszyć max graczy poniżej obecnej liczby

## Przykłady Użycia

### 1. Tworzenie Lobby z Custom Settings
```typescript
// Dashboard - Custom Create
const lobbyData = {
  name: "Tournament Finals",
  maxPlayers: 6,
  roundCount: 10
}
```

### 2. Edycja Ustawień w Lobby
```typescript
// Host zmienia ustawienia
const updateData = {
  maxPlayers: 8,
  roundCount: 7
}
```

### 3. Real-time Synchronizacja
```typescript
// Automatyczna aktualizacja dla wszystkich członków
channel.bind('lobby-settings-updated', (data) => {
  setLobby(data.lobby)
})
```

## Błędy i Ich Obsługa

### Częste Błędy:
1. **"Cannot reduce max players"** - Próba zmniejszenia poniżej obecnej liczby
2. **"Cannot update settings while game is active"** - Edycja podczas gry
3. **"Only the host can update lobby settings"** - Brak uprawnień

### Obsługa w UI:
- Komunikaty błędów wyświetlane jako alerty
- Walidacja w czasie rzeczywistym
- Automatyczne przywracanie poprzednich wartości przy błędzie
