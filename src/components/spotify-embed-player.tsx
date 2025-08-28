'use client'

interface SpotifyEmbedPlayerProps {
  trackId: string
  height?: number
  className?: string
}

export default function SpotifyEmbedPlayer({ 
  trackId, 
  height = 152, 
  className = ""
}: SpotifyEmbedPlayerProps) {
  const embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`

  return (
    <div className={`spotify-embed-container ${className}`}>
      <iframe
        src={embedUrl}
        width="100%"
        height={height}
        frameBorder="0"
        allowFullScreen
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        style={{ 
          borderRadius: '12px'
        }}
        title={`Spotify track ${trackId}`}
      />
    </div>
  )
}
