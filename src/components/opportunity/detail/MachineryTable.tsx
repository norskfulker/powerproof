import type { KeyboardEvent } from 'react'
import type { MachineryItem } from '@/types/database'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { iconClassName, iconToneForIndex } from '@/lib/iconClassNames'
import { Card } from '@/components/ui/card'
import {
  opportunityDetailCardClass,
  opportunityCardTopSlotRowClass,
  opportunityCardTopSlotTitleClass,
  opportunityCardTopSlotTone,
} from '@/lib/opportunityCardClasses'

import {
  Wrench,
  Package,
  AlertTriangle,
  CheckCircle2,
  Info,
  Minus,
  TrendingUp,
  DollarSign,
  Hash,
  Gauge,
  ShieldCheck,
} from '@/lib/icons'

// ─── Color System ────────────────────────────────────────────────

const MACHINERY_PALETTE = [
  { hue: 227 },   // 0: Blue
  { hue: 262 },   // 1: Violet
  { hue: 152 },   // 2: Emerald
  { hue: 32 },    // 3: Amber
  { hue: 199 },   // 4: Sky
  { hue: 340 },   // 5: Rose
  { hue: 174 },   // 6: Teal
  { hue: 280 },   // 7: Fuchsia
] as const

const MANDATORY_CONFIG: Record<string, { 
  variant: 'danger' | 'warning' | 'default'
  icon: React.ElementType
  label: string
}> = {
  Essential: { variant: 'danger',  icon: AlertTriangle, label: 'Essential' },
  Required:  { variant: 'warning', icon: CheckCircle2,  label: 'Required' },
  Optional:  { variant: 'default', icon: Info,          label: 'Optional' },
}

const CONDITION_ICONS: Record<string, React.ElementType> = {
  new: ShieldCheck,
  used: Package,
  refurbished: Wrench,
}

// ─── Color Derivation ────────────────────────────────────────────

function getMachineryColors(index: number) {
  const { hue } = MACHINERY_PALETTE[index % MACHINERY_PALETTE.length]
  return {
    hue,
    solid: `hsl(${hue}, 85%, 58%)`,
    mutedBg: `hsla(${hue}, 70%, 95%, 0.6)`,
    cardBg: `hsla(${hue}, 60%, 97%, 0.4)`,
    glow: `hsla(${hue}, 85%, 58%, 0.15)`,
    text: `hsl(${hue}, 80%, 45%)`,
  }
}

// ─── Enhanced Visual Components ────────────────────────────────────

function MetricBadge({ 
  children, 
  variant = 'default',
}: { 
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
  size?: 'sm' | 'md' | 'lg'
}) {
  const variantMap = {
    default: 'gray',
    success: 'green',
    warning: 'amber',
    danger: 'red',
    primary: 'blue',
  } as const

  return (
    <Badge
      variant={variantMap[variant]}
      className="font-semibold font-black uppercase tracking-wider"
    >
      {children}
    </Badge>
  )
}

// ─── Equipment Row ───────────────────────────────────────────────

function EquipmentRow({
  item,
  index,
  fmtCost,
  rowClassName,
  onRowClick,
  onRowKeyDown,
}: {
  item: MachineryItem
  index: number
  fmtCost: (n: number) => string
  rowClassName?: (index: number) => string | undefined
  onRowClick?: (index: number) => void
  onRowKeyDown?: (index: number, e: KeyboardEvent) => void
}) {
  const colors = getMachineryColors(index)
  const mandatory = String(item.mandatory ?? '').trim() || 'Optional'
  const mandatoryConfig = MANDATORY_CONFIG[mandatory] ?? MANDATORY_CONFIG.Optional
  const MandatoryIcon = mandatoryConfig.icon
  const blurred = Boolean(rowClassName?.(index)?.includes('blur'))
  const ConditionIcon = item.new_or_used ? CONDITION_ICONS[item.new_or_used.toLowerCase()] : undefined

  return (
    <tr
      className={cn(
        'group transition-colors duration-200',
        !blurred && 'hover:bg-muted/30',
        rowClassName?.(index),
        blurred && 'cursor-pointer',
      )}
      role={blurred ? 'button' : undefined}
      tabIndex={blurred ? 0 : undefined}
      onClick={blurred && onRowClick ? () => onRowClick(index) : undefined}
      onKeyDown={
        blurred && onRowKeyDown
          ? (e) => onRowKeyDown(index, e)
          : undefined
      }
    >
      {/* Equipment */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Wrench className={iconClassName({ tone: iconToneForIndex(index), size: 'md', interactive: true })} strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <div className="font-sans text-[13px] font-bold text-foreground truncate">
              {item.name}
            </div>
            {item.sourcing ? (
              <div className="font-sans text-[10px] text-muted-foreground/60 mt-0.5 truncate max-w-[180px]">
                via {item.sourcing}
              </div>
            ) : null}
          </div>
        </div>
      </td>

      {/* Qty */}
      <td className="px-3 py-3.5 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-lg bg-muted/40 px-2.5 py-1">
          <Hash className="h-3 w-3 text-muted-foreground/50" strokeWidth={2.5} />
          <span className="font-sans text-[13px] font-bold tabular-nums text-foreground">
            {item.qty ?? 1}
          </span>
        </div>
      </td>

      {/* Cost */}
      <td className="px-4 py-3.5 text-right">
        {item.cost_approx > 0 ? (
          <span 
            className="font-sans text-[13px] font-bold tabular-nums"
            style={{ color: colors.text }}
          >
            {fmtCost(item.cost_approx)}
          </span>
        ) : (
          <span className="font-sans text-[13px] font-medium text-muted-foreground/40">
            —
          </span>
        )}
      </td>

      {/* Level */}
      <td className="px-3 py-3.5 text-center hidden sm:table-cell">
        <MetricBadge variant={mandatoryConfig.variant} size="lg">
          <span className="flex items-center gap-1">
            <MandatoryIcon className="h-3 w-3" strokeWidth={2.5} />
            {mandatoryConfig.label}
          </span>
        </MetricBadge>
      </td>

      {/* Condition */}
      <td className="px-3 py-3.5 text-center hidden sm:table-cell">
        {item.new_or_used ? (
          <div className="inline-flex items-center gap-1.5">
            {ConditionIcon && (
              <ConditionIcon 
                className={cn(
                  "h-3.5 w-3.5",
                  item.new_or_used.toLowerCase() === 'new' ? "text-success" :
                  item.new_or_used.toLowerCase() === 'used' ? "text-warning" :
                  "text-primary"
                )} 
                strokeWidth={2.5} 
              />
            )}
            <span className="font-sans text-[12px] font-medium text-muted-foreground capitalize">
              {item.new_or_used}
            </span>
          </div>
        ) : (
          <span className="font-sans text-[12px] text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Purpose */}
      <td className="px-4 py-3.5 hidden md:table-cell max-w-[280px]">
        {item.purpose ? (
          <p
            className="font-sans text-[12px] font-medium text-muted-foreground/70 leading-relaxed line-clamp-2"
            title={item.purpose}
          >
            {item.purpose}
          </p>
        ) : (
          <span className="font-sans text-[12px] text-muted-foreground/40">—</span>
        )}
      </td>
    </tr>
  )
}

// ─── Total Row ───────────────────────────────────────────────────

function TotalRow({ total, formatMoney }: { total: number; formatMoney: (n: number) => string }) {
  return (
    <tr className="border-t-2 border-border-subtle/60">
      <td colSpan={2} className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" strokeWidth={2.5} />
          <span className="font-sans text-[11px] font-black uppercase tracking-wider text-muted-foreground">
            Total Equipment Cost
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="font-sans text-[18px] font-black tracking-tight tabular-nums text-foreground">
          {formatMoney(total)}
        </span>
      </td>
      <td colSpan={3} className="hidden sm:table-cell" />
    </tr>
  )
}

// ─── Main Component ───────────────────────────────────────────────

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
  hideHeader = false,
}: MachineryTableProps) {
  if (!machinery?.length) return null

  const fmtCost = formatCost ?? formatMoney
  const total = machinery.reduce((sum, m) => sum + (m.cost_approx ?? 0) * (m.qty ?? 1), 0)
  const showTotal = machinery.some((m) => (m.cost_approx ?? 0) > 0)

  const table = (
    <div className="overflow-x-auto -mx-2 px-2">
      <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border-subtle">
                {[
                  { label: 'Equipment', icon: Wrench, align: 'left' },
                  { label: 'Qty', icon: Hash, align: 'center' },
                  { label: 'Cost', icon: DollarSign, align: 'right' },
                  { label: 'Level', icon: Gauge, align: 'center', hidden: 'sm' },
                  { label: 'Condition', icon: ShieldCheck, align: 'center', hidden: 'sm' },
                  { label: 'Purpose', icon: Info, align: 'left', hidden: 'md' },
                ].map((col) => (
                  <th 
                    key={col.label}
                    className={cn(
                      "px-3 py-2.5 font-sans text-[10px] font-black uppercase tracking-wider text-muted-foreground/60",
                      col.align === 'left' && "text-left",
                      col.align === 'center' && "text-center",
                      col.align === 'right' && "text-right",
                      col.hidden === 'sm' && "hidden sm:table-cell",
                      col.hidden === 'md' && "hidden md:table-cell",
                    )}
                  >
                    <div className={cn(
                      "flex items-center gap-1.5",
                      col.align === 'center' && "justify-center",
                      col.align === 'right' && "justify-end",
                    )}>
                      <col.icon className="h-3 w-3 opacity-50" strokeWidth={2.5} />
                      {col.label}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/40">
              {machinery.map((item, i) => (
                <EquipmentRow
                  key={i}
                  item={item}
                  index={i}
                  fmtCost={fmtCost}
                  rowClassName={rowClassName}
                  onRowClick={onRowClick}
                  onRowKeyDown={onRowKeyDown}
                />
              ))}
            </tbody>
            {showTotal && (
              <tfoot>
                <TotalRow total={total} formatMoney={formatMoney} />
              </tfoot>
            )}
          </table>
    </div>
  )

  if (hideHeader) {
    return table
  }

  return (
    <Card
      padding="sm"
      radius="lg"
      className={cn(opportunityDetailCardClass, 'overflow-visible')}
      topSlot={
        <div className={opportunityCardTopSlotRowClass}>
          <Wrench
            className={iconClassName({ tone: 'primary', size: 'sm', active: true })}
            strokeWidth={2.5}
            aria-hidden
          />
          <span className={cn(opportunityCardTopSlotTitleClass, opportunityCardTopSlotTone.primary.title)}>
            Machinery & Equipment
          </span>
        </div>
      }
    >
      <p className="mb-4 font-sans text-[12px] text-muted-foreground">
        {machinery.length} item{machinery.length > 1 ? 's' : ''} required
      </p>
      {table}
    </Card>
  )
}