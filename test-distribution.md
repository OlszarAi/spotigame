# Test Logiki Dystrybucji Piosenek

## Nowa logika wyboru piosenek:

### Zmiany:
1. **Spotify API**: Zmieniono z `medium_term` (6 miesięcy) na `short_term` (ostatnie 4 tygodnie)
2. **Limit utworów**: Zwiększono z 20 do 50 utworów na gracza
3. **Sprawiedliwy podział**: Każdy gracz ma proporcjonalnie tyle samo piosenek
4. **Bez duplikatów**: Ta sama piosenka (trackId) nie może się powtórzyć

### Przykładowe scenariusze:

#### Scenariusz 1: 2 graczy, 10 rund
- Gracz 1: 5 piosenek
- Gracz 2: 5 piosenek
- Podział: 10 ÷ 2 = 5 piosenek na gracza

#### Scenariusz 2: 3 graczy, 10 rund  
- Gracz 1: 4 piosenki (3 + 1 dodatkowa)
- Gracz 2: 3 piosenki
- Gracz 3: 3 piosenki
- Podział: 10 ÷ 3 = 3 piosenki na gracza + 1 pozostała (idzie do pierwszego gracza)

#### Scenariusz 3: 4 graczy, 15 rund
- Gracz 1: 4 piosenki (3 + 1 dodatkowa)
- Gracz 2: 4 piosenki (3 + 1 dodatkowa) 
- Gracz 3: 4 piosenki (3 + 1 dodatkowa)
- Gracz 4: 3 piosenki
- Podział: 15 ÷ 4 = 3 piosenki na gracza + 3 pozostałe (idą do pierwszych trzech graczy)

### Algorytm:
1. Pobierz 50 najlepszych utworów z ostatnich 4 tygodni od każdego gracza
2. Oblicz sprawiedliwy podział: `songsPerPlayer = Math.floor(totalRounds / numberOfPlayers)`
3. Oblicz pozostałe piosenki: `remainingSongs = totalRounds % numberOfPlayers`
4. Przydziel każdemu graczowi `songsPerPlayer` piosenek + 1 dodatkową dla pierwszych `remainingSongs` graczy
5. Sprawdź duplikaty używając `Set<trackId>`
6. Jeśli nie ma wystarczająco utworów z powodu duplikatów, dozbieraj z dowolnego gracza
7. Pomieszaj kolejność i rozpocznij grę

### Logowanie:
- Wypisuje informacje o sprawiedliwym podziale
- Pokazuje liczbę piosenek na gracza
- Wyświetla finalną dystrybucję po utworzeniu gry
