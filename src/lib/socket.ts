// For now, we'll use a simple polling mechanism for real-time updates
// In production, you'd want to implement proper WebSockets

export class GameSocket {
  private static instance: GameSocket
  private listeners: Map<string, Array<(data: any) => void>> = new Map()
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

  static getInstance(): GameSocket {
    if (!GameSocket.instance) {
      GameSocket.instance = new GameSocket()
    }
    return GameSocket.instance
  }

  // Subscribe to lobby updates
  subscribeLobby(lobbyId: string, callback: (lobby: any) => void) {
    const key = `lobby-${lobbyId}`
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }
    
    this.listeners.get(key)?.push(callback)

    // Start polling for updates
    if (!this.pollingIntervals.has(key)) {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/lobby?id=${lobbyId}`)
          if (response.ok) {
            const data = await response.json()
            this.notifyListeners(key, data.lobby)
          }
        } catch (error) {
          console.error('Error polling lobby:', error)
        }
      }, 2000) // Poll every 2 seconds

      this.pollingIntervals.set(key, interval)
    }
  }

  // Unsubscribe from lobby updates
  unsubscribeLobby(lobbyId: string, callback: (lobby: any) => void) {
    const key = `lobby-${lobbyId}`
    const listeners = this.listeners.get(key)
    
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }

      // Stop polling if no more listeners
      if (listeners.length === 0) {
        const interval = this.pollingIntervals.get(key)
        if (interval) {
          clearInterval(interval)
          this.pollingIntervals.delete(key)
        }
        this.listeners.delete(key)
      }
    }
  }

  // Emit an event to notify about changes
  emit(event: string, data: any) {
    this.notifyListeners(event, data)
  }

  private notifyListeners(key: string, data: any) {
    const listeners = this.listeners.get(key)
    if (listeners) {
      listeners.forEach(callback => callback(data))
    }
  }

  // Clean up all intervals
  cleanup() {
    this.pollingIntervals.forEach(interval => clearInterval(interval))
    this.pollingIntervals.clear()
    this.listeners.clear()
  }
}
