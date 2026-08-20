import type { KeyboardEvent } from 'react'
import type { MachineryItem } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const MANDATORY_VARIANT: Record<string, 'red' | 'amber' | 'gray'> = {
  Essential: 'red',
  Required: 'amber',
  Optional: 'gray',
}

export type MachineryTableProps = {
  machinery: MachineryItem[]
  formatMoney: (n: number) => string
  formatCost?: (cost: number) => string
  rowClassName?: (index: number) => string | undefined
  onRowClick?: (index: number) => void
  onRowKeyDown?: (index: number, e: KeyboardEvent) => void
  hideHeader?: boolean
}

export function MachineryTable({
  machinery,
  formatMoney,
  formatCost,
  rowClassName,
  onRowClick,
  onRowKeyDown,
}: MachineryTableProps) {
  if (!machinery?.length) return null

  const fmtCost = formatCost ?? formatMoney
  const total = machinery.reduce((sum, m) => sum + (m.cost_approx ?? 0) * (m.qty ?? 1), 0)
  const showTotal = machinery.some((m) => (m.cost_approx ?? 0) > 0)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Equipment</TableHead>
          <TableHead className="w-[4rem] text-right">Qty</TableHead>
          <TableHead className="w-[7rem] text-right">Cost</TableHead>
          <TableHead className="hidden sm:table-cell">Level</TableHead>
          <TableHead className="hidden sm:table-cell">Condition</TableHead>
          <TableHead className="hidden pr-4 md:table-cell">Purpose</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {machinery.map((item, i) => {
          const mandatory = String(item.mandatory ?? '').trim() || 'Optional'
          const blurred = Boolean(rowClassName?.(i)?.includes('blur'))
          return (
            <TableRow
              key={`${item.name}-${i}`}
              className={cn(rowClassName?.(i), blurred && 'cursor-pointer')}
              role={blurred ? 'button' : undefined}
              tabIndex={blurred ? 0 : undefined}
              onClick={blurred && onRowClick ? () => onRowClick(i) : undefined}
              onKeyDown={
                blurred && onRowKeyDown ? (e) => onRowKeyDown(i, e) : undefined
              }
            >
              <TableCell className="pl-4">
                <div className="font-medium text-foreground">{item.name}</div>
                {item.sourcing ? (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">via {item.sourcing}</div>
                ) : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.qty ?? 1}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {item.cost_approx > 0 ? fmtCost(item.cost_approx) : '—'}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Badge
                  size="sm"
                  variant={MANDATORY_VARIANT[mandatory] ?? 'gray'}
                  className="font-semibold"
                >
                  {mandatory}
                </Badge>
              </TableCell>
              <TableCell className="hidden capitalize text-muted-foreground sm:table-cell">
                {item.new_or_used || '—'}
              </TableCell>
              <TableCell className="hidden max-w-[16rem] pr-4 text-muted-foreground md:table-cell">
                <span className="line-clamp-2">{item.purpose || '—'}</span>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      {showTotal ? (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2} className="pl-4 font-semibold">
              Total equipment cost
            </TableCell>
            <TableCell className="text-right font-bold tabular-nums">
              {formatMoney(total)}
            </TableCell>
            <TableCell colSpan={3} className="hidden sm:table-cell" />
          </TableRow>
        </TableFooter>
      ) : null}
    </Table>
  )
}
