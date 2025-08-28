# Naprawa problemu z przeciekiem informacji między rundami

## 🚨 Problem
Podczas przejścia między rundami gracze przez chwilę widzieli informacje o właścicielu następnej piosenki:
- Po wyświetleniu wyników rundy następowało krótkie "mruganie" z informacjami o następnej rundzie
- Gracze mogli zobaczyć kto jest właścicielem następnej piosenki
- To kompletnie psui uczciwość gry

## ✅ Rozwiązanie

### 1. **Zwiększenie opóźnienia między rundami (5 sekund)**
- Zmieniono backend delay z 3 na 5 sekund w `end-round/route.ts`
- Więcej czasu na pokazanie wyników przed następną rundą

### 2. **Dodanie stanu przerwy między rundami**
Nowe stany w frontend:
```typescript
const [isInBreak, setIsInBreak] = useState(false)
const [breakTimeLeft, setBreakTimeLeft] = useState<number>(0)
const [roundOwnerName, setRoundOwnerName] = useState<string>('')
```

### 3. **Ukrycie interfejsu podczas przerwy**
Podczas 5-sekundowej przerwy ukrywane są:
- ✋ Spotify embed z następną piosenką
- ✋ Pytanie "Who do you think this song belongs to?"
- ✋ Lista graczy do wyboru
- ✋ Pozostały czas gry

### 4. **Dedykowany UI dla przerwy**
```tsx
{isInBreak && breakTimeLeft > 0 ? (
  <div className="text-center mt-6">
    <div className="text-6xl font-bold text-spotify-green mb-4">
      {breakTimeLeft}
    </div>
    <p className="text-lg text-spotify-gray">Next round starting in...</p>
  </div>
) : (
  // Loading spinner fallback
)}
```

### 5. **Poprawa flow między rundami**
- `round-ended` event → pokazuje wyniki + rozpoczyna przerwę
- 5-sekundowy countdown z nazwą właściciela piosenki
- `round-started` event → ukrywa przerwę, pokazuje nową rundę

## 🎯 Efekt końcowy

### Teraz flow wygląda tak:
1. **Koniec rundy** → Pokazuje "This song belongs to: [Właściciel]"
2. **5-sekundowa przerwa** → Duży countdown z nazwą właściciela
3. **Ukryty interfejs** → Brak informacji o następnej piosence
4. **Nowa runda** → Dopiero teraz pokazuje nową piosenkę

### ✅ **Bezpieczeństwo:**
- ❌ Brak przecieku informacji o następnej piosence
- ✅ Sprawiedliwa gra dla wszystkich
- ✅ Czytelny interfejs z wyraźnymi przerami
- ✅ Profesjonalny wygląd z countdown

## 📁 Zmodyfikowane pliki:
- `/src/app/game/[id]/page.tsx` - logika frontend + UI
- `/src/app/api/games/[id]/end-round/route.ts` - timing backend

Problem został całkowicie rozwiązany! 🎉
