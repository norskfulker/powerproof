import { FileText } from '@/lib/icons'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { iconClassName } from '@/lib/iconClassNames'
import type { UserPlaybook } from '@/lib/playbookTypes'
import { playbookContextEntries } from '@/lib/playbookDisplay'
import { cn } from '@/lib/utils'

interface Props {
  playbook: UserPlaybook
  className?: string
  isMobile?: boolean
}

export function PlaybookBriefDetails({ playbook, className, isMobile = false }: Props) {
  const contextRows = playbookContextEntries(playbook)
  const workspaceName =
    playbook.business_name?.trim() &&
    playbook.business_description?.trim() &&
    playbook.business_name.trim() !== playbook.business_description.trim()
      ? playbook.business_name.trim()
      : null

  if (contextRows.length === 0 && !workspaceName) return null

  const subtitleParts = [
    workspaceName ? `Workspace: ${workspaceName}` : null,
    contextRows.length > 0 ? `${contextRows.length} intel field${contextRows.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean)

  return (
    <section className={cn('min-w-0 w-full', className)}>
      <Accordion
        type="single"
        collapsible
        className="w-full space-y-0 rounded-none border-0 bg-transparent p-0 shadow-none"
      >
        <AccordionItem value="playbook-brief">
          <AccordionTrigger className="items-center hover:no-underline">
            <span className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <FileText
                className={iconClassName({ tone: 'primary', size: 'md', interactive: true })}
                strokeWidth={2.5}
                aria-hidden
              />
              <span className="min-w-0">
                <span className="font-sans text-sm font-bold uppercase tracking-wider text-foreground/90">
                  Playbook brief
                </span>
                <span className="mt-0.5 block font-sans text-[11px] font-medium text-muted-foreground">
                  {subtitleParts.join(' · ')}
                </span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4">
              {workspaceName ? (
                <div className="rounded-xl border border-border-subtle/50 bg-muted/15 px-4 py-3">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Workspace
                  </p>
                  <p className="mt-1 font-sans text-[14px] font-semibold text-foreground">{workspaceName}</p>
                </div>
              ) : null}

              {contextRows.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Founder intel
                  </p>
                  {contextRows.map((row, index) => (
                    <div
                      key={row.key}
                      className="rounded-xl border border-border-subtle/50 bg-muted/15 px-4 py-3"
                    >
                      {contextRows.length > 1 ? (
                        <p className="font-sans text-[10px] font-medium text-muted-foreground">
                          Answer {index + 1}
                        </p>
                      ) : null}
                      <p className="mt-0.5 font-sans text-[13px] leading-relaxed text-foreground/90">{row.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
