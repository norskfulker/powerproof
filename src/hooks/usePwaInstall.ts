import { useCallback, useSyncExternalStore, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PwaInstallSnapshot = {
  isInstalled: boolean
  isInstallable: boolean
}

const EMPTY_SNAPSHOT: PwaInstallSnapshot = {
  isInstalled: false,
  isInstallable: false,
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let isInstalledGlobal = false
let cachedSnapshot: PwaInstallSnapshot = EMPTY_SNAPSHOT
const subscribers = new Set<() => void>()
let listenersAttached = false

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function refreshSnapshot(): PwaInstallSnapshot {
  const isInstalled = isInstalledGlobal
  const isInstallable = !isInstalled && deferredPrompt != null

  if (
    cachedSnapshot.isInstalled === isInstalled &&
    cachedSnapshot.isInstallable === isInstallable
  ) {
    return cachedSnapshot
  }

  cachedSnapshot = { isInstalled, isInstallable }
  return cachedSnapshot
}

function notifySubscribers(): void {
  refreshSnapshot()
  subscribers.forEach((listener) => listener())
}

function attachPwaInstallListeners(): void {
  if (listenersAttached || typeof window === 'undefined') return
  listenersAttached = true
  isInstalledGlobal = isStandaloneDisplay()

  const onBeforeInstall = (event: Event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notifySubscribers()
  }

  const onInstalled = () => {
    deferredPrompt = null
    isInstalledGlobal = true
    notifySubscribers()
  }

  const onDisplayModeChange = () => {
    isInstalledGlobal = isStandaloneDisplay()
    notifySubscribers()
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstall)
  window.addEventListener('appinstalled', onInstalled)
  window.matchMedia('(display-mode: standalone)').addEventListener('change', onDisplayModeChange)
  window.matchMedia('(display-mode: fullscreen)').addEventListener('change', onDisplayModeChange)
}

function subscribe(listener: () => void): () => void {
  attachPwaInstallListeners()
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

function getSnapshot(): PwaInstallSnapshot {
  attachPwaInstallListeners()
  return refreshSnapshot()
}

function getServerSnapshot(): PwaInstallSnapshot {
  return EMPTY_SNAPSHOT
}

/** Sidebar-only PWA install — shows when the browser fires `beforeinstallprompt`. */
export function usePwaInstall() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [installing, setInstalling] = useState(false)

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } finally {
      deferredPrompt = null
      setInstalling(false)
      notifySubscribers()
    }
  }, [])

  return {
    ...snapshot,
    installing,
    install,
  }
}
