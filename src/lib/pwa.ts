import { registerSW } from 'virtual:pwa-register'

type PwaUpdatePayload = {
  applyUpdate: () => void
  /** Waiting worker script URL — used to avoid re-prompting for the same pending update. */
  updateKey: string
}

type PwaUpdateListener = (payload: PwaUpdatePayload) => void

const PWA_UPDATE_DISMISS_PREFIX = 'powerproof-pwa-dismiss:'

let updateListener: PwaUpdateListener | null = null
let pendingUpdate: PwaUpdatePayload | null = null
let registrationStarted = false

function dismissKeyForUpdate(updateKey: string): string {
  return `${PWA_UPDATE_DISMISS_PREFIX}${updateKey}`
}

export function isPwaUpdateDismissed(updateKey: string): boolean {
  try {
    return sessionStorage.getItem(dismissKeyForUpdate(updateKey)) === '1'
  } catch {
    return false
  }
}

export function dismissPwaUpdate(updateKey: string): void {
  try {
    sessionStorage.setItem(dismissKeyForUpdate(updateKey), '1')
  } catch {
    /* ignore quota / private mode */
  }
}

async function resolveWaitingUpdateKey(): Promise<string> {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const waiting = reg?.waiting
    if (waiting?.scriptURL) return waiting.scriptURL
  } catch {
    /* ignore */
  }
  return 'pending'
}

/** React components subscribe to surface install / update UI. */
export function bindPwaUpdateListener(listener: PwaUpdateListener | null): void {
  updateListener = listener
  if (listener && pendingUpdate) {
    listener(pendingUpdate)
    pendingUpdate = null
  }
}

function notifyUpdate(applyUpdate: () => void, updateKey: string): void {
  const payload = { applyUpdate, updateKey }
  if (updateListener) {
    updateListener(payload)
    return
  }
  pendingUpdate = payload
}

/** Registers the service worker; update UI is shown via `bindPwaUpdateListener`. */
export function registerPwaServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  if (registrationStarted) return
  registrationStarted = true

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      void resolveWaitingUpdateKey().then((updateKey) => {
        if (isPwaUpdateDismissed(updateKey)) return
        notifyUpdate(() => {
          try {
            sessionStorage.removeItem(dismissKeyForUpdate(updateKey))
          } catch {
            /* ignore */
          }
          void updateSW(true)
        }, updateKey)
      })
    },
    onRegistered(registration) {
      if (!registration) return
      window.setInterval(() => {
        void registration.update()
      }, 60 * 60 * 1000)
    },
    onRegisterError(error) {
      console.error('[PWA] Service worker registration failed', error)
    },
  })
}
