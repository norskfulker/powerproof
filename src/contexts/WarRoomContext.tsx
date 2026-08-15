import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWarRoom } from '@/hooks/useWarRoom'

const WarRoomContext = createContext<ReturnType<typeof useWarRoom> | null>(null)

export function WarRoomProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const warRoom = useWarRoom(user?.id)
  return <WarRoomContext.Provider value={warRoom}>{children}</WarRoomContext.Provider>
}

export function useWarRoomContext() {
  const ctx = useContext(WarRoomContext)
  if (!ctx) {
    throw new Error('useWarRoomContext must be used within WarRoomProvider')
  }
  return ctx
}

export function useWarRoomContextOptional() {
  return useContext(WarRoomContext)
}
