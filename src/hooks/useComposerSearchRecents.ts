import { useEffect, useState } from 'react'

import {
  COMPOSER_SEARCH_RECENTS_EVENT,
  readComposerSearchRecents,
  type ComposerSearchRecent,
} from '@/lib/composerSearchRecents'

export function useComposerSearchRecents(): ComposerSearchRecent[] {
  const [recents, setRecents] = useState(() => readComposerSearchRecents())

  useEffect(() => {
    const sync = () => setRecents(readComposerSearchRecents())
    window.addEventListener(COMPOSER_SEARCH_RECENTS_EVENT, sync)
    return () => window.removeEventListener(COMPOSER_SEARCH_RECENTS_EVENT, sync)
  }, [])

  return recents
}
