import { useEffect, useState } from 'react'
import { Loader2, ShoppingBag } from '@/lib/icons'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { usePlanUpsell } from '@/hooks/usePlanUpsell'
import { useShopifyConnection } from '@/hooks/useShopifyConnection'
import { EdgeApiError, isEdgeApiError } from '@/lib/edgeApiError'
import { planGateReason } from '@/lib/planGate'
import {
  insertShortlistedProduct,
  isValidShopifyDomain,
  listProductOnShopify,
  normalizeShopDomain,
  startShopifyConnect,
} from '@/lib/shopifyApi'
import type { SourcingCard } from '@/lib/sourcingTypes'

type Panel = 'idle' | 'connect' | 'price'

export function SupplierDrawerShopifyAction({
  card,
  sourceSearchId = null,
}: {
  card: SourcingCard
  sourceSearchId?: string | null
}) {
  const { user } = useAuth()
  const showPlanUpsell = usePlanUpsell()
  const { data: connection, isLoading: connectionLoading } = useShopifyConnection()

  const [panel, setPanel] = useState<Panel>('idle')
  const [shopInput, setShopInput] = useState('')
  const [shopError, setShopError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  const [priceInput, setPriceInput] = useState('')
  const [priceError, setPriceError] = useState<string | null>(null)
  const [listing, setListing] = useState(false)

  const connected = Boolean(connection?.connected)
  const userCurrency = card.currency_display

  useEffect(() => {
    setPanel('idle')
    setShopInput('')
    setShopError(null)
    setPriceInput('')
    setPriceError(null)
    setConnecting(false)
    setListing(false)
  }, [card.product_url])

  const handleConnectSubmit = async () => {
    const domain = normalizeShopDomain(shopInput)
    if (!isValidShopifyDomain(domain)) {
      setShopError('Enter a valid store domain like your-store.myshopify.com')
      return
    }
    setShopError(null)
    setConnecting(true)
    try {
      const authorizeUrl = await startShopifyConnect(domain)
      window.location.href = authorizeUrl
    } catch (e) {
      if (planGateReason(e)) {
        showPlanUpsell(e)
      } else {
        toast.error(
          e instanceof EdgeApiError
            ? e.displayMessage
            : 'Could not start Shopify connection. Try again.',
        )
      }
      setConnecting(false)
    }
  }

  const handleListSubmit = async () => {
    if (!user?.id) {
      toast.error('Please sign in to add products to Shopify.')
      return
    }

    const parsed = Number.parseFloat(priceInput.trim())
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setPriceError('Enter a valid listing price greater than zero')
      return
    }
    setPriceError(null)
    setListing(true)

    try {
      const rowId = await insertShortlistedProduct({
        userId: user.id,
        card,
        userPrice: parsed,
        userCurrency,
        sourceSearchId,
      })
      await listProductOnShopify(rowId)
      toast.success(
        'Added as a draft product in your Shopify store — review and publish it from Shopify admin.',
      )
      setPanel('idle')
      setPriceInput('')
    } catch (e) {
      if (planGateReason(e) || (isEdgeApiError(e) && e.status === 402)) {
        showPlanUpsell(e)
      } else if (isEdgeApiError(e)) {
        toast.error(e.displayMessage)
      } else {
        toast.error('Could not add product to Shopify. Try again.')
      }
    } finally {
      setListing(false)
    }
  }

  if (connectionLoading) {
    return (
      <Button type="button" variant="secondary" size="md" full disabled className="gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking Shopify…
      </Button>
    )
  }

  if (panel === 'connect') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-sunken/40 p-3">
        <Input
          label="Shopify store domain"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder="your-store.myshopify.com"
          value={shopInput}
          onChange={(e) => {
            setShopInput(e.target.value)
            if (shopError) setShopError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleConnectSubmit()
            }
          }}
          helperText={shopError ?? 'Must be a *.myshopify.com domain'}
          helperVariant={shopError ? 'error' : 'default'}
          disabled={connecting}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={connecting}
            onClick={() => {
              setPanel('idle')
              setShopError(null)
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1 gap-1.5"
            loading={connecting}
            disabled={connecting || !shopInput.trim()}
            onClick={() => void handleConnectSubmit()}
          >
            Connect
          </Button>
        </div>
      </div>
    )
  }

  if (panel === 'price') {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-sunken/40 p-3">
        <Input
          label={`Listing price (${userCurrency})`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="e.g. 499"
          value={priceInput}
          onChange={(e) => {
            setPriceInput(e.target.value)
            if (priceError) setPriceError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleListSubmit()
            }
          }}
          helperText={priceError ?? 'This becomes the draft product price in Shopify'}
          helperVariant={priceError ? 'error' : 'default'}
          disabled={listing}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={listing}
            onClick={() => {
              setPanel('idle')
              setPriceError(null)
            }}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="flex-1 gap-1.5"
            loading={listing}
            disabled={listing || !priceInput.trim()}
            onClick={() => void handleListSubmit()}
            icon={!listing ? <ShoppingBag className="h-3.5 w-3.5" /> : undefined}
          >
            {listing ? 'Adding…' : 'Add as draft'}
          </Button>
        </div>
      </div>
    )
  }

  if (connected) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="md"
        full
        className="gap-2"
        onClick={() => setPanel('price')}
        icon={<ShoppingBag className="h-3.5 w-3.5" />}
      >
        Add to Shopify
      </Button>
    )
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="md"
      full
      className="gap-2"
      onClick={() => setPanel('connect')}
      icon={<ShoppingBag className="h-3.5 w-3.5" />}
    >
      Connect Shopify
    </Button>
  )
}
