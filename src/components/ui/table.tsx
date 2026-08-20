import * as React from 'react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** Shared head cell — same look as scanner report tables. */
export const tableHeadClassName =
  'px-3 py-2.5 text-left align-middle font-display text-[13px] font-semibold leading-tight tracking-tight text-muted-foreground'

/** Shared body row — same look as scanner report tables. */
export const tableRowClassName =
  'group border-b border-border-subtle/50 transition-colors last:border-0 hover:bg-muted/30'

/** Shared body cell — same look as scanner report tables. */
export const tableCellClassName =
  'px-3.5 py-2.5 align-top text-[12.5px] leading-relaxed text-foreground'

const tableElementClassName = 'w-full min-w-0 table-fixed border-collapse'

function elementDisplayName(child: React.ReactElement): string | undefined {
  const type = child.type
  if (typeof type === 'string') return type
  return (type as { displayName?: string }).displayName
}

type TableProps = Omit<React.ComponentPropsWithoutRef<typeof Card>, 'padding' | 'topSlot' | 'children'> & {
  /** Optional `<colgroup>` mirrored in header + body tables for `table-fixed` alignment. */
  colGroup?: React.ReactNode
  /**
   * Explicit header node (usually `<TableHeader>…</TableHeader>`).
   * If omitted, the first `TableHeader` child is lifted into the Card topSlot.
   */
  header?: React.ReactNode
  children?: React.ReactNode
}

/**
 * Card-shelled data table — same pattern as the website scanner report.
 * Header lives in the Card topSlot; body/footer render in the Card content.
 */
function Table({ className, colGroup, header: headerProp, children, ...rest }: TableProps) {
  let headerNode: React.ReactNode = headerProp ?? null
  const bodyNodes: React.ReactNode[] = []

  if (headerProp == null) {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && elementDisplayName(child) === 'TableHeader') {
        headerNode = child
        return
      }
      bodyNodes.push(child)
    })
  } else {
    bodyNodes.push(children)
  }

  return (
    <Card
      padding="none"
      radius="lg"
      className={cn('shadow-sm', className)}
      topSlotClassName="p-0"
      topSlot={
        headerNode ? (
          <table className={tableElementClassName}>
            {colGroup}
            {headerNode}
          </table>
        ) : null
      }
      {...rest}
    >
      <div className="w-full min-w-0 overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <table className={tableElementClassName}>
          {colGroup}
          {bodyNodes}
        </table>
      </div>
    </Card>
  )
}
Table.displayName = 'Table'

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn(className)} {...props} />,
)
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
  ),
)
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('border-t border-border-subtle/60 bg-muted/30 font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  ),
)
TableFooter.displayName = 'TableFooter'

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr ref={ref} className={cn(tableRowClassName, className)} {...props} />
  ),
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th ref={ref} className={cn(tableHeadClassName, className)} {...props} />
  ),
)
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn(tableCellClassName, className)} {...props} />
  ),
)
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
  ),
)
TableCaption.displayName = 'TableCaption'

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
