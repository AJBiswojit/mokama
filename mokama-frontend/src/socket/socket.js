import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ||
                   'http://localhost:5000'

let socket = null

export const connectSocket = (token) => {
  // Already connected — reuse
  if (socket?.connected) return socket

  // Disconnect stale socket before reconnecting
  if (socket) {
    socket.disconnect()
    socket = null
  }

  socket = io(SOCKET_URL, {
    auth:              { token },
    // Allow polling fallback — Railway needs this
    transports:        ['polling', 'websocket'],
    reconnection:      true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
    timeout:           20000,
  })

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id)
  })

  socket.on('connect_error', (err) => {
    // Non-fatal — app works fine without socket (falls back to manual refresh)
    console.warn('🔌 Socket unavailable:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export const getSocket = () => socket

export default { connectSocket, disconnectSocket, getSocket }
