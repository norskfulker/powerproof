/** Discover hero / room fluid card background palette per workspace mode. */
export type LandingFluidThemeId =
  | 'default'
  | 'home'
  | 'sky'
  | 'research'
  | 'war-room'
  | 'roadmap'
  | 'sourcing'
  | 'itch'
  | 'market-test'
  | 'search'
  | 'opportunity-detail'
  | 'opportunity-research'
  | 'investors'

export type LandingFluidThemePalette = {
  color1: string
  color2: string
  color3: string
  /** Surface tint over the grain (0–1 alpha in hex suffix). */
  overlayClassName?: string
}

const BASE_GRAINIENT = {
  timeSpeed: 0.25,
  colorBalance: 0.0,
  warpStrength: 1.0,
  warpFrequency: 5.0,
  warpSpeed: 2.0,
  warpAmplitude: 50.0,
  blendAngle: 0.0,
  blendSoftness: 0.05,
  rotationAmount: 500.0,
  noiseScale: 2.0,
  grainAmount: 0.1,
  grainScale: 2.0,
  grainAnimated: false,
  contrast: 1.5,
  gamma: 1.0,
  saturation: 1.0,
  centerX: 0.0,
  centerY: 0.0,
  zoom: 0.9,
}

export const LANDING_FLUID_THEMES: Record<
  LandingFluidThemeId,
  LandingFluidThemePalette & typeof BASE_GRAINIENT
> = {
  default: {
    ...BASE_GRAINIENT,
    color1: '#FF9FFC',
    color2: '#414ce6',
    color3: '#B497CF',
    overlayClassName: 'bg-surface/35',
  },
  /** Marketing home hero — airy sky blues tuned for dark foreground text. */
  sky: {
    ...BASE_GRAINIENT,
    color1: '#BAE6FD',
    color2: '#38BDF8',
    color3: '#7DD3FC',
    overlayClassName: 'bg-surface/30',
    contrast: 1.45,
    saturation: 1.05,
    zoom: 0.92,
  },
  /** Deep indigo anchored on brand primary. */
  home: {
    ...BASE_GRAINIENT,
    color1: '#0B1224',
    color2: '#3858E8',
    color3: '#1E2A5E',
    overlayClassName: 'bg-black/38',
    contrast: 1.7,
    saturation: 1.08,
    zoom: 0.92,
  },
  research: {
    ...BASE_GRAINIENT,
    color1: '#C4B5FD',
    color2: '#414ce6',
    color3: '#818CF8',
    overlayClassName: 'bg-surface/32',
  },
  'war-room': {
    ...BASE_GRAINIENT,
    color1: '#FCA5A5',
    color2: '#E11D48',
    color3: '#FB7185',
    overlayClassName: 'bg-surface/38',
  },
  roadmap: {
    ...BASE_GRAINIENT,
    color1: '#67E8F9',
    color2: '#0891B2',
    color3: '#6366F1',
    overlayClassName: 'bg-surface/34',
  },
  sourcing: {
    ...BASE_GRAINIENT,
    color1: '#FDE68A',
    color2: '#D97706',
    color3: '#F59E0B',
    overlayClassName: 'bg-surface/36',
  },
  itch: {
    ...BASE_GRAINIENT,
    color1: '#E7E5E4',
    color2: '#57534E',
    color3: '#A8A29E',
    overlayClassName: 'bg-surface/40',
  },
  'market-test': {
    ...BASE_GRAINIENT,
    color1: '#A7F3D0',
    color2: '#059669',
    color3: '#34D399',
    overlayClassName: 'bg-surface/34',
  },
  search: {
    ...BASE_GRAINIENT,
    color1: '#FBCFE8',
    color2: '#DB2777',
    color3: '#F472B6',
    overlayClassName: 'bg-surface/35',
  },
  /** Opportunity detail catalog — deep navy/indigo for white hero text. */
  'opportunity-detail': {
    ...BASE_GRAINIENT,
    color1: '#0B1F3A',
    color2: '#1D4ED8',
    color3: '#3730A3',
    overlayClassName: 'bg-black/25',
    contrast: 1.65,
    saturation: 1.05,
  },
  /** User research opportunity detail — deep violet/plum for white hero text. */
  'opportunity-research': {
    ...BASE_GRAINIENT,
    color1: '#2E1065',
    color2: '#6D28D9',
    color3: '#4338CA',
    overlayClassName: 'bg-black/22',
    contrast: 1.65,
    saturation: 1.08,
  },
  /** Investors landing — warm forest & sand tones. */
  investors: {
    ...BASE_GRAINIENT,
    color1: '#2A3328',
    color2: '#6B8F71',
    color3: '#C9B896',
    overlayClassName: 'bg-black/28',
    contrast: 1.58,
    saturation: 0.92,
    zoom: 0.93,
  },
}

export function landingFluidThemeFromDiscoverHero(opts: {
  isPlaybookMode: boolean
  isResearchMode: boolean
  isRoadmapMode: boolean
  isSourcingMode: boolean
  isItchMode: boolean
  isMarketTestMode: boolean
}): LandingFluidThemeId {
  if (opts.isPlaybookMode) return 'war-room'
  if (opts.isResearchMode) return 'research'
  if (opts.isRoadmapMode) return 'roadmap'
  if (opts.isSourcingMode) return 'sourcing'
  if (opts.isItchMode) return 'itch'
  if (opts.isMarketTestMode) return 'market-test'
  return 'search'
}

/** Opportunity detail heroes use darker palettes tuned for white typography. */
export function landingFluidThemeForOpportunityDetail(isUserResearch: boolean): LandingFluidThemeId {
  return isUserResearch ? 'opportunity-research' : 'opportunity-detail'
}
