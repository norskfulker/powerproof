/** Sync discover hero composer toggle preference (discover vs research). */
export const HERO_COMPOSER_TARGET_KEY = 'powerproof_hero_composer_target'
export type HeroComposerTarget = 'discover' | 'research'

export function readHeroComposerTarget(): HeroComposerTarget {
  try {
    const v = localStorage.getItem(HERO_COMPOSER_TARGET_KEY)
    if (v === 'research') return 'research'
  } catch {
    /* ignore */
  }
  return 'discover'
}

export function writeHeroComposerTarget(next: HeroComposerTarget) {
  try {
    localStorage.setItem(HERO_COMPOSER_TARGET_KEY, next)
  } catch {
    /* ignore */
  }
}

/** Route-aware default for discover hero composer toggle. */
export function heroComposerTargetFromPath(pathname: string, search = ''): HeroComposerTarget {
  if (pathname === '/room' || pathname === '/room/') {
    const mode = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('mode')
    if (mode === 'research' || mode === 'arsenal' || mode === 'war-room') return 'research'
    return 'discover'
  }
  if (pathname === '/my-research' || pathname.startsWith('/my-research/')) {
    return 'research'
  }
  return 'discover'
}
