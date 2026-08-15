import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type NavbarTrailContextValue = {
  trail: string | null
  setTrail: (label: string | null) => void
}

const NavbarTrailContext = createContext<NavbarTrailContextValue | null>(null)

export function NavbarTrailProvider({ children }: { children: ReactNode }) {
  const [trail, setTrailState] = useState<string | null>(null)
  const setTrail = useCallback((label: string | null) => {
    setTrailState(label)
  }, [])
  const value = useMemo(() => ({ trail, setTrail }), [trail, setTrail])
  return <NavbarTrailContext.Provider value={value}>{children}</NavbarTrailContext.Provider>
}

export function useNavbarTrail() {
  const ctx = useContext(NavbarTrailContext)
  if (!ctx) throw new Error('useNavbarTrail must be used within NavbarTrailProvider')
  return ctx
}
