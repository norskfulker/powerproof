import { useEffect, useState } from 'react'

import { BYOK_CHANGE_EVENT, byok } from '@/lib/byok'

/** Reactive BYOK active state (updates when key is saved or cleared). */
export function useByok(): boolean {
  const [active, setActive] = useState(() => byok.isActive())

  useEffect(() => {
    const sync = () => setActive(byok.isActive())
    window.addEventListener(BYOK_CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(BYOK_CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return active
}
