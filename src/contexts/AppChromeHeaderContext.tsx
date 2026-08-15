import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type AppChromeRegenerateConfig = {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

export type AppChromeHeaderBadges = {
  /** Filled / primary emphasis chip next to the title. */
  primary?: string | null
  /** Muted secondary text next to the title (often after a bullet). */
  ghost?: string | null
}

/** Admin-only room preview: off = real data; free = fresh free user; nil = zero data. */
export type RoomAdminPreviewVariant = 'off' | 'free' | 'nil'

type AppChromeHeaderState = {
  title: string | null
  /** Optional leading icon next to the title (shown only when set). */
  icon: ReactNode | null
  badges: AppChromeHeaderBadges | null
  endActions: ReactNode | null
  tabs: ReactNode | null
  regenerate: AppChromeRegenerateConfig | null
  /** When true, AppChromeHeader shows the Ask AI button (set by AskAiChatStateProvider). */
  askAiAvailable: boolean
  /** Admin-only: force PRO-locked preview on opportunity detail. */
  previewProLocked: boolean
  /** Admin-only: room empty-state preview (free / nil). */
  previewRoomVariant: RoomAdminPreviewVariant
  setTitle: (title: string | null) => void
  setIcon: (icon: ReactNode | null) => void
  setBadges: (badges: AppChromeHeaderBadges | null) => void
  setEndActions: (node: ReactNode | null) => void
  setTabs: (node: ReactNode | null) => void
  setRegenerate: (config: AppChromeRegenerateConfig | null) => void
  setAskAiAvailable: (next: boolean) => void
  setPreviewProLocked: (next: boolean) => void
  setPreviewRoomVariant: (next: RoomAdminPreviewVariant) => void
}

const AppChromeHeaderContext = createContext<AppChromeHeaderState | null>(null)

export function AppChromeHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string | null>(null)
  const [icon, setIconState] = useState<ReactNode | null>(null)
  const [badges, setBadgesState] = useState<AppChromeHeaderBadges | null>(null)
  const [endActions, setEndActionsState] = useState<ReactNode | null>(null)
  const [tabs, setTabsState] = useState<ReactNode | null>(null)
  const [regenerate, setRegenerateState] = useState<AppChromeRegenerateConfig | null>(null)
  const [askAiAvailable, setAskAiAvailableState] = useState(false)
  const [previewProLocked, setPreviewProLockedState] = useState(false)
  const [previewRoomVariant, setPreviewRoomVariantState] =
    useState<RoomAdminPreviewVariant>('off')

  const setTitle = useCallback((next: string | null) => {
    setTitleState(next)
  }, [])

  const setIcon = useCallback((next: ReactNode | null) => {
    setIconState(next)
  }, [])

  const setBadges = useCallback((next: AppChromeHeaderBadges | null) => {
    setBadgesState((prev) => {
      if (prev == null && next == null) return prev
      if (
        prev != null &&
        next != null &&
        prev.primary === next.primary &&
        prev.ghost === next.ghost
      ) {
        return prev
      }
      return next
    })
  }, [])

  const setEndActions = useCallback((next: ReactNode | null) => {
    setEndActionsState(next)
  }, [])

  const setTabs = useCallback((next: ReactNode | null) => {
    setTabsState(next)
  }, [])

  const setRegenerate = useCallback((next: AppChromeRegenerateConfig | null) => {
    setRegenerateState(next)
  }, [])

  const setAskAiAvailable = useCallback((next: boolean) => {
    setAskAiAvailableState(next)
  }, [])

  const setPreviewProLocked = useCallback((next: boolean) => {
    setPreviewProLockedState(next)
  }, [])

  const setPreviewRoomVariant = useCallback((next: RoomAdminPreviewVariant) => {
    setPreviewRoomVariantState(next)
  }, [])

  const value = useMemo(
    () => ({
      title,
      icon,
      badges,
      endActions,
      tabs,
      regenerate,
      askAiAvailable,
      previewProLocked,
      previewRoomVariant,
      setTitle,
      setIcon,
      setBadges,
      setEndActions,
      setTabs,
      setRegenerate,
      setAskAiAvailable,
      setPreviewProLocked,
      setPreviewRoomVariant,
    }),
    [
      title,
      icon,
      badges,
      endActions,
      tabs,
      regenerate,
      askAiAvailable,
      previewProLocked,
      previewRoomVariant,
      setTitle,
      setIcon,
      setBadges,
      setEndActions,
      setTabs,
      setRegenerate,
      setAskAiAvailable,
      setPreviewProLocked,
      setPreviewRoomVariant,
    ],
  )

  return (
    <AppChromeHeaderContext.Provider value={value}>{children}</AppChromeHeaderContext.Provider>
  )
}

export function useAppChromeHeader() {
  const ctx = useContext(AppChromeHeaderContext)
  if (!ctx) {
    throw new Error('useAppChromeHeader must be used within AppChromeHeaderProvider')
  }
  return ctx
}

export function useAppChromeHeaderOptional() {
  return useContext(AppChromeHeaderContext)
}

/** Register page title / icon / badges / end actions / tabs / regenerate for the global chrome header. */
export function useRegisterAppChromeHeader(options: {
  title?: string | null
  icon?: ReactNode | null
  badges?: AppChromeHeaderBadges | null
  endActions?: ReactNode | null
  tabs?: ReactNode | null
  regenerate?: AppChromeRegenerateConfig | null
}) {
  const chrome = useAppChromeHeaderOptional()
  // Depend on stable setters — not the whole `chrome` value. Updating title/badges
  // rebuilds the context object; putting `chrome` in effect deps caused infinite loops.
  const setTitle = chrome?.setTitle
  const setIcon = chrome?.setIcon
  const setBadges = chrome?.setBadges
  const setEndActions = chrome?.setEndActions
  const setTabs = chrome?.setTabs
  const setRegenerate = chrome?.setRegenerate

  const {
    title = null,
    icon = null,
    badges = null,
    endActions = null,
    tabs = null,
    regenerate = null,
  } = options
  const primaryBadge = badges?.primary ?? null
  const ghostBadge = badges?.ghost ?? null
  const regenerateOnClick = regenerate?.onClick
  const regenerateDisabled = regenerate?.disabled
  const regenerateLoading = regenerate?.loading

  useEffect(() => {
    if (!setTitle) return
    setTitle(title)
    return () => {
      setTitle(null)
    }
  }, [setTitle, title])

  useEffect(() => {
    if (!setIcon) return
    setIcon(icon)
    return () => {
      setIcon(null)
    }
  }, [setIcon, icon])

  useEffect(() => {
    if (!setBadges) return
    if (!primaryBadge && !ghostBadge) {
      setBadges(null)
      return () => {
        setBadges(null)
      }
    }
    setBadges({ primary: primaryBadge, ghost: ghostBadge })
    return () => {
      setBadges(null)
    }
  }, [setBadges, primaryBadge, ghostBadge])

  useEffect(() => {
    if (!setEndActions) return
    setEndActions(endActions ?? null)
    return () => {
      setEndActions(null)
    }
  }, [setEndActions, endActions])

  useEffect(() => {
    if (!setTabs) return
    setTabs(tabs ?? null)
    return () => {
      setTabs(null)
    }
  }, [setTabs, tabs])

  useEffect(() => {
    if (!setRegenerate) return
    if (!regenerateOnClick) {
      setRegenerate(null)
      return () => {
        setRegenerate(null)
      }
    }
    setRegenerate({
      onClick: regenerateOnClick,
      disabled: regenerateDisabled,
      loading: regenerateLoading,
    })
    return () => {
      setRegenerate(null)
    }
  }, [setRegenerate, regenerateOnClick, regenerateDisabled, regenerateLoading])
}
