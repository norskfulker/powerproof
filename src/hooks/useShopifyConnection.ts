import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { toast } from '@/components/ui/sonner'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export type ShopifyConnection = {
  connected: boolean
  shopDomain: string | null
}

export const shopifyConnectionQueryKey = (userId: string | undefined) =>
  ['shopify-connection', userId] as const

async function fetchShopifyConnection(): Promise<ShopifyConnection> {
  const { data, error } = await supabase
    .from('user_shopify_stores')
    .select('shop_domain')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error

  const shopDomain =
    data && typeof (data as { shop_domain?: unknown }).shop_domain === 'string'
      ? (data as { shop_domain: string }).shop_domain
      : null

  return {
    connected: Boolean(shopDomain),
    shopDomain,
  }
}

/** Active Shopify store for the current user — cached for the session. */
export function useShopifyConnection() {
  const { user } = useAuth()

  return useQuery({
    queryKey: shopifyConnectionQueryKey(user?.id),
    queryFn: fetchShopifyConnection,
    enabled: Boolean(user?.id),
    staleTime: Infinity,
  })
}

/**
 * On OAuth return (`?shopify_connected=1`), toast success, refresh connection
 * cache, and strip the callback query params from the URL.
 */
export function useShopifyConnectedCallback() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    if (searchParams.get('shopify_connected') !== '1') return

    handledRef.current = true
    const shop = searchParams.get('shop')?.trim()

    toast.success(
      shop
        ? `Connected to ${shop}`
        : 'Shopify store connected successfully',
    )

    void queryClient.invalidateQueries({
      queryKey: shopifyConnectionQueryKey(user?.id),
    })

    const next = new URLSearchParams(searchParams)
    next.delete('shopify_connected')
    next.delete('shop')
    const search = next.toString()
    navigate(
      { pathname: window.location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    )
  }, [navigate, queryClient, searchParams, user?.id])
}
