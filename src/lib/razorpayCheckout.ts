/**
 * Single entry point for opening the Razorpay checkout.
 *
 * - Lazy-loads `checkout.js` once per page session (deduped via a module-level
 *   promise so concurrent callers share the same load).
 * - Always charges in INR (account-level constraint); foreign-currency display
 *   prices are converted to INR by the caller before invoking this helper.
 * - Designed so subscription flows can
 *   open Razorpay without re-implementing script loading or window.Razorpay
 *   plumbing.
 */

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance
  }
}

interface RazorpayInstance {
  open: () => void
  on?: (event: string, cb: (...args: unknown[]) => void) => void
  close?: () => void
}

interface RazorpayOptions {
  key: string
  amount?: number
  currency: string
  name?: string
  description?: string
  order_id?: string
  subscription_id?: string
  prefill?: { email?: string; name?: string; contact?: string }
  notes?: Record<string, string>
  handler?: (response: RazorpaySuccessResponse) => void
  modal?: { ondismiss?: () => void; escape?: boolean; backdropclose?: boolean }
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string
  razorpay_signature: string
  razorpay_order_id?: string
  razorpay_subscription_id?: string
}

export interface OpenRazorpayCheckoutOpts {
  /** Required only for one-time order checkout. Subscription pricing comes from the Razorpay Plan. */
  amountInInr?: number
  keyId?: string
  name?: string
  description?: string
  /** Optional order id (display/reference only — Razorpay validates only when created via API). */
  orderId?: string
  subscriptionId?: string
  prefill?: { email?: string; name?: string; contact?: string }
  notes?: Record<string, string>
  onSuccess: (resp: RazorpaySuccessResponse) => void | Promise<void>
  onDismiss?: () => void
  onError?: (err: unknown) => void
}

export class RazorpayConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RazorpayConfigError'
  }
}

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js'
const SCRIPT_FLAG = 'data-razorpay-checkout'

let scriptLoadPromise: Promise<void> | null = null

const loadCheckoutScript = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only load in the browser'))
  }
  if (window.Razorpay) return Promise.resolve()
  if (scriptLoadPromise) return scriptLoadPromise

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[${SCRIPT_FLAG}="1"]`)
    if (existing) {
      if (window.Razorpay) {
        resolve()
        return
      }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => {
          scriptLoadPromise = null
          reject(new Error('Failed to load Razorpay checkout.js'))
        },
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = CHECKOUT_SRC
    script.async = true
    script.defer = true
    script.setAttribute(SCRIPT_FLAG, '1')
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoadPromise = null
      reject(new Error('Failed to load Razorpay checkout.js'))
    }
    document.head.appendChild(script)
  })

  return scriptLoadPromise
}

/** Idempotent: safe to call multiple times. Resolves once the SDK is ready. */
export const ensureRazorpayLoaded = (): Promise<void> => loadCheckoutScript()

/** Open the Razorpay checkout modal. Always charges in INR. */
export async function openRazorpayCheckout(opts: OpenRazorpayCheckoutOpts): Promise<void> {
  const key =
    (opts.keyId ??
      (import.meta.env.VITE_RAZORPAY_LIVE_KEY_ID as string | undefined) ??
      (import.meta.env.VITE_RAZORPAY_KEY_ID as string | undefined) ??
      (import.meta.env.VITE_RAZORPAY_PUBLIC_KEY as string | undefined) ??
      '')
      .trim()
  const isPlaceholder = key === 'rzp_test_your_key_id_here' || key === 'rzp_live_your_key_id_here'
  const isTestKey = key.startsWith('rzp_test_')
  if (!key) {
    throw new RazorpayConfigError(
      'Razorpay key missing. Set VITE_RAZORPAY_LIVE_KEY_ID (or VITE_RAZORPAY_KEY_ID) in your env.',
    )
  }
  if (isPlaceholder) {
    throw new RazorpayConfigError(
      'Razorpay is using a placeholder key. Replace it with your real rzp_live_ key in env and restart the app.',
    )
  }
  if (import.meta.env.PROD && isTestKey) {
    throw new RazorpayConfigError('Production build cannot use a Razorpay test key. Use an rzp_live_ key.')
  }

  const amount = Number(opts.amountInInr)
  if (!opts.subscriptionId && (!Number.isFinite(amount) || amount <= 0)) {
    throw new RazorpayConfigError('Invalid amount for Razorpay checkout')
  }

  await loadCheckoutScript()
  if (!window.Razorpay) {
    throw new RazorpayConfigError('Razorpay SDK did not initialise')
  }

  const options: RazorpayOptions = {
    key,
    amount: opts.subscriptionId ? undefined : Math.round(amount * 100),
    currency: 'INR',
    name: opts.name,
    description: opts.description,
    order_id: opts.orderId,
    subscription_id: opts.subscriptionId,
    prefill: opts.prefill,
    notes: opts.notes,
    handler: (response) => {
      try {
        const result = opts.onSuccess(response)
        if (result && typeof (result as Promise<void>).then === 'function') {
          ;(result as Promise<void>).catch((err) => opts.onError?.(err))
        }
      } catch (err) {
        opts.onError?.(err)
      }
    },
    modal: {
      ondismiss: () => opts.onDismiss?.(),
    },
  }

  try {
    const rzp = new window.Razorpay(options)
    rzp.open()
  } catch (err) {
    opts.onError?.(err)
    throw err
  }
}
