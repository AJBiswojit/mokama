import { useEffect } from 'react'
import { getSocket } from '../socket/socket'

/**
 * useSocket — safely subscribes to socket events, auto-cleans up on unmount.
 * If socket is not connected, silently skips — UI still works via normal API calls.
 *
 * Usage:
 *   useSocket({
 *     workStarted:      (data) => load(),
 *     paymentConfirmed: (data) => toast.success('Payment sent!'),
 *   })
 */
const useSocket = (events = {}) => {
  useEffect(() => {
    const socket = getSocket()
    // Socket may not be available (not logged in, connection failed, etc.)
    // This is safe — the app works without it, just no real-time updates
    if (!socket) return

    Object.entries(events).forEach(([event, handler]) => {
      socket.on(event, handler)
    })

    return () => {
      // Re-get socket in cleanup (may have changed)
      const s = getSocket()
      if (!s) return
      Object.entries(events).forEach(([event, handler]) => {
        s.off(event, handler)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}

export default useSocket
