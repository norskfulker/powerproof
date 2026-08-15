import { DetailHeroPanel } from '@/components/detail/DetailHeroPanel'
import { useBreakpoint } from '@/hooks/useBreakpoint'

type Props = {
  query: string
  resetKey: string
}

export function MarketTestHeroFluid({ query, resetKey }: Props) {
  const bp = useBreakpoint()

  return (
    <DetailHeroPanel
      id="market-test-hero"
      title={query.trim() || 'Market reality check'}
      bp={bp}
      twScroll={{ startWhenInView: true, inViewResetKey: resetKey }}
      fluidTheme="market-test"
      fluidTextTone="dark"
    />
  )
}
