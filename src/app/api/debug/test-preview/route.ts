import { NextRequest, NextResponse } from 'next/server'
import SpotifyWebApi from 'spotify-web-api-node'

/* eslint-disable @typescript-eslint/no-require-imports */
const spotifyPreviewFinder = require('spotify-preview-finder')

export async function POST(request: NextRequest) {
  try {
    const { trackId, trackName, artistName, accessToken } = await request.json()
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 401 })
    }

    const spotifyApi = new SpotifyWebApi()
    spotifyApi.setAccessToken(accessToken)

    const results = {
      originalPreview: null as string | null,
      finderPreview: null as string | null,
      searchPreview: null as string | null
    }

    // Strategy 1: Original Spotify API
    try {
      const trackResponse = await spotifyApi.getTrack(trackId)
      results.originalPreview = trackResponse.body.preview_url
      console.log(`Original preview for ${trackName}:`, results.originalPreview ? '✅' : '❌')
    } catch (error) {
      console.error('Error getting original preview:', error)
    }

    // Strategy 2: spotify-preview-finder
    try {
      const finderResult = await spotifyPreviewFinder(trackId)
      if (finderResult) {
        results.finderPreview = typeof finderResult === 'string' ? finderResult : finderResult.url || finderResult.toString()
        console.log(`Finder preview for ${trackName}:`, results.finderPreview ? '✅' : '❌')
      }
    } catch (error) {
      console.error('Error with spotify-preview-finder:', error)
    }

    // Strategy 3: Search method
    try {
      const searchResponse = await spotifyApi.searchTracks(`track:"${trackName}" artist:"${artistName}"`, {
        limit: 10,
        market: 'US'
      })
      
      const tracksWithPreviews = searchResponse.body.tracks?.items.filter(track => track.preview_url) || []
      if (tracksWithPreviews.length > 0) {
        // Find exact match or best match
        const exactMatch = tracksWithPreviews.find(track => 
          track.name.toLowerCase() === trackName.toLowerCase() && 
          track.artists.some(artist => artist.name.toLowerCase() === artistName.toLowerCase())
        )
        
        results.searchPreview = exactMatch?.preview_url || tracksWithPreviews[0].preview_url
        console.log(`Search preview for ${trackName}:`, results.searchPreview ? '✅' : '❌')
      }
    } catch (error) {
      console.error('Error with search method:', error)
    }

    // Strategy 4: Try to find alternative versions
    if (!results.originalPreview && !results.finderPreview && !results.searchPreview) {
      try {
        const alternativeSearch = await spotifyApi.searchTracks(`"${trackName}"`, {
          limit: 20,
          market: 'US'
        })
        
        const alternativeTracks = alternativeSearch.body.tracks?.items.filter(track => 
          track.preview_url && 
          track.artists.some(artist => artist.name.toLowerCase().includes(artistName.toLowerCase()))
        ) || []
        
        if (alternativeTracks.length > 0) {
          results.searchPreview = alternativeTracks[0].preview_url
          console.log(`Alternative search preview for ${trackName}:`, results.searchPreview ? '✅' : '❌')
        }
      } catch (error) {
        console.error('Error with alternative search:', error)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error testing preview:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
