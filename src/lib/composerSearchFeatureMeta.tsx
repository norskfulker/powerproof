import type { RemixIcon } from '@/lib/icons'
import { Compass, Map, PackageSearch, Radar, Swords, Target, Wand2 } from '@/lib/icons'
import type { ComposerSearchFeature } from '@/lib/composerSearchRecents'

const FEATURE_ICONS: Record<ComposerSearchFeature, RemixIcon> = {
  research: Wand2,
  'war-room': Swords,
  roadmap: Map,
  'market-test': Target,
  sourcing: PackageSearch,
  opportunities: Compass,
  scanner: Radar,
}

export function composerSearchFeatureIcon(feature: ComposerSearchFeature): RemixIcon {
  return FEATURE_ICONS[feature]
}
