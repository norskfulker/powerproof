import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { ClarifyNavModel } from '@/lib/clarifyNav'

type ClarificationNavState = {
  model: ClarifyNavModel
  onSelectItem: (id: string) => void
}

type ClarificationNavContextValue = {
  nav: ClarificationNavState | null
  setNav: (nav: ClarificationNavState | null) => void
}

const ClarificationNavContext = createContext<ClarificationNavContextValue | null>(null)

function navModelKey(model: ClarifyNavModel | null): string {
  if (!model) return ''
  const parts: string[] = [model.phase, model.activeItemId ?? '']
  for (const item of model.items) {
    parts.push(item.id, item.status ?? '', item.active ? '1' : '0', item.loading ? '1' : '0')
    for (const child of item.children ?? []) {
      parts.push(child.id, child.status ?? '', child.active ? '1' : '0')
      for (const grandchild of child.children ?? []) {
        parts.push(grandchild.id, grandchild.status ?? '', grandchild.active ? '1' : '0', grandchild.answered ? '1' : '0')
      }
    }
  }
  return parts.join('\0')
}

export function ClarificationNavProvider({ children }: { children: ReactNode }) {
  const [nav, setNavState] = useState<ClarificationNavState | null>(null)

  const setNav = useCallback((next: ClarificationNavState | null) => {
    setNavState(next)
  }, [])

  const value = useMemo(() => ({ nav, setNav }), [nav, setNav])

  return (
    <ClarificationNavContext.Provider value={value}>{children}</ClarificationNavContext.Provider>
  )
}

export function useClarificationNavOptional() {
  return useContext(ClarificationNavContext)
}

export function useClarificationNavRegistration(
  model: ClarifyNavModel,
  onSelectItem: (id: string) => void,
) {
  const setNav = useContext(ClarificationNavContext)?.setNav
  const modelKey = navModelKey(model)
  const onSelectRef = useRef(onSelectItem)
  onSelectRef.current = onSelectItem

  useEffect(() => {
    if (!setNav) return
    setNav({
      model,
      onSelectItem: (id) => onSelectRef.current(id),
    })
  }, [setNav, modelKey])

  useEffect(() => {
    if (!setNav) return
    return () => setNav(null)
  }, [setNav])
}
