# Spotify Preview URL Problem - Debugging Results

## Problem Description
ALL tracks are returning `preview_url: null`, even popular international tracks like "Blinding Lights" by The Weeknd.

## Evidence
- 157 total tracks fetched
- 0 tracks have preview URLs
- Even test track "Blinding Lights" returns null
- "Insufficient client scope" errors

## Likely Causes

### 1. Spotify App Configuration Issue
Check in Spotify Developer Dashboard:
- App might be in Development mode (limits preview access)
- Missing required settings for preview URLs
- Wrong app type selected

### 2. Region/Market Issue
- Poland might have restrictions on preview URLs
- Need to check if market parameter is needed

### 3. API Quota/Rate Limiting
- App might be hitting Spotify's rate limits
- Preview URLs might be disabled due to quota

## Next Steps
1. Check Spotify Developer Dashboard settings
2. Try different markets/regions in API calls
3. Verify app is in Production mode
4. Check if preview URLs are working in Spotify Web Player

## Testing Commands
```bash
# Test with market parameter
curl -X GET "https://api.spotify.com/v1/search?q=blinding%20lights%20the%20weeknd&type=track&market=US&limit=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
