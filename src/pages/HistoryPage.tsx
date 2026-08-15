import { useNavigate } from 'react-router-dom'

import { Seo } from '@/components/Seo'
import { DashboardGrid } from '@/components/page-shells'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import { useComposerSearchRecents } from '@/hooks/useComposerSearchRecents'
import { composerSearchFeatureIcon } from '@/lib/composerSearchFeatureMeta'
import { composerSearchFeatureLabel } from '@/lib/composerSearchRecents'
import { History } from '@/lib/icons'
import { cn } from '@/lib/utils'

function formatWhen(at: number): string {
  if (!Number.isFinite(at) || at <= 0) return ''
  const diffMs = Date.now() - at
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(at).toLocaleDateString()
}

export function HistoryPage() {
  useRegisterAppChromeHeader({
    title: 'History',
    icon: <History className="h-full w-full" aria-hidden />,
  })
  const navigate = useNavigate()
  const recents = useComposerSearchRecents()

  return (
    <DashboardGrid>
      <Seo
        title="History | PowerProof"
        description="Browse your full chat and research history across PowerProof."
        canonicalPath="/history"
        noIndex
      />

      <div className="mx-auto w-full max-w-3xl px-1 layout-sm:px-0">
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted-foreground layout-sm:text-[15px]">
          Every chat and research session you've started, grouped by feature. Pick one up where you
          left off.
        </p>

        {recents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border-subtle/70 bg-muted/20 px-6 py-16 text-center">
            <History className="mb-3 h-8 w-8 text-muted-foreground/70" aria-hidden />
            <p className="text-sm font-semibold text-foreground">No history yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
              Start a research, war room, or roadmap session and it will show up here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {recents.map((row) => {
              const Icon = composerSearchFeatureIcon(row.feature)
              const when = formatWhen(row.at)
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => navigate(row.href)}
                    className={cn(
                      'group flex w-full min-w-0 items-center gap-3 rounded-lg border border-border-subtle/70 bg-card px-4 py-3 text-left transition-colors',
                      'hover:border-border hover:bg-[var(--sidebar-nav-hover-bg)]',
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-foreground">
                      <Icon className="h-[1.125rem] w-[1.125rem]" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-semibold text-foreground">
                        {row.query}
                      </span>
                      {when ? (
                        <span className="mt-0.5 truncate text-[12px] text-muted-foreground">
                          {when}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 rounded-md border border-border-subtle/80 bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground/80">
                      {composerSearchFeatureLabel(row.feature)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </DashboardGrid>
  )
}

export default HistoryPage
