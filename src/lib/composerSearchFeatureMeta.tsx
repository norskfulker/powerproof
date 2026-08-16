import type { RemixIcon } from '@/lib/icons'
import { Compass, Crosshair, Scan2Line, SearchAiLine, SeoLine, Store2Line, Waypoints } from '@/lib/icons'
import type { ComposerSearchFeature } from '@/lib/composerSearchRecents'

const FEATURE_ICONS: Record<ComposerSearchFeature, RemixIcon> = {
  research: SeoLine,
  'war-room': Crosshair,
  roadmap: Waypoints,
  'market-test': Store2Line,
  sourcing: SearchAiLine,
  opportunities: Compass,
  scanner: Scan2Line,
}

export function composerSearchFeatureIcon(feature: ComposerSearchFeature): RemixIcon {
  return FEATURE_ICONS[feature]
}
