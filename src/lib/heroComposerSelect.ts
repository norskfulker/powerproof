/** Shared compact footer select chrome for Discover hero composer. */
export const HERO_FOOTER_SELECT_TRIGGER_CLASS =
  'h-9 min-h-9 w-auto min-w-0 max-w-[5.25rem] gap-0.5 rounded border-0 bg-transparent px-1.5 py-0 text-sm font-medium shadow-none hover:bg-transparent hover:translate-y-0 focus:ring-0 focus:border-0 focus:shadow-none [&>svg:last-child]:h-3.5 [&>svg:last-child]:w-3.5 [&>svg:last-child]:opacity-45' +
  ' sm:h-7 sm:min-h-7 sm:max-w-[5.25rem] sm:rounded-md sm:px-1.5 sm:text-[11px] sm:gap-0.5 sm:[&>svg:last-child]:h-3 sm:[&>svg:last-child]:w-3' +
  ' max-layout-sm:max-w-[7.5rem] max-layout-sm:px-3'

export const HERO_FOOTER_CHIP_MENU_ITEM_ROW_CLASS = 'gap-3'

/** Label beside icon in discover hero footer chip triggers. */
export const HERO_FOOTER_CHIP_LABEL_CLASS =
  'text-[10px] font-semibold leading-none text-foreground/85'

/** Icon size inside discover hero footer chip triggers. */
export const HERO_FOOTER_CHIP_ICON_CLASS = 'h-3.5 w-3.5 shrink-0'

/** Inner layout for icon + label footer chips. */
export const HERO_FOOTER_CHIP_SURFACE_CLASS = 'inline-flex items-center gap-1.5'

/** Icon + label chip triggers in discover hero composer footer. */
export const HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS =
  'h-9 min-h-9 min-w-0 max-w-none items-center justify-center px-2 py-0 sm:h-7 sm:min-h-7'

/** Standalone footer chip button (e.g. How it works) — matches Select chip trigger height. */
export const HERO_FOOTER_CHIP_BUTTON_CLASS =
  'inline-flex h-9 min-h-9 min-w-0 max-w-[9.5rem] shrink items-center justify-center overflow-hidden rounded px-2.5 py-0 text-sm font-medium text-foreground/85 shadow-sm transition-[color,box-shadow,border-color,background-color,transform] duration-200 hover:-translate-y-0 hover:border-primary/35 hover:bg-primary/5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 disabled:pointer-events-none disabled:opacity-50 border border-border-subtle/70 bg-card sm:h-7 sm:min-h-7 sm:rounded-md sm:px-2 sm:text-[11px]'

/** Extra mobile padding/type for footer chips — height comes from `HERO_FOOTER_CHIP_BUTTON_CLASS`. */
export const HERO_MOBILE_FOOTER_CHIP_BUTTON_CLASS =
  'max-layout-sm:px-3 max-layout-sm:text-sm'

/** Square icon-only controls in mobile composer footer (+, submit). */
export const HERO_MOBILE_FOOTER_ICON_BUTTON_CLASS =
  'max-layout-sm:h-9 max-layout-sm:min-h-9 max-layout-sm:w-9 max-layout-sm:min-w-9'

export const HERO_FOOTER_CHIP_BUTTON_WAR_ROOM_CLASS =
  'hover:border-red-200/60 hover:bg-red-500/[0.06] focus-visible:ring-red-500/20 focus-visible:border-red-300/50 dark:hover:border-red-900/40'

/** @deprecated Use `HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS`. */
export const HERO_FOOTER_CHIP_STYLE_TRIGGER_CLASS = HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS

/** @deprecated Use `HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS`. */
export const HERO_FOOTER_CHIP_MODEL_TRIGGER_CLASS = HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS

/** @deprecated Use `HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS`. */
export const HERO_FOOTER_CHIP_COUNTRY_TRIGGER_CLASS = HERO_FOOTER_CHIP_ICON_TRIGGER_CLASS

/** Discover hero footer dropdown — tight inset, subtle chrome. */
export const HERO_FOOTER_SELECT_CONTENT_CLASS =
  'z-[10001] rounded-md border border-border-subtle/80 bg-popover shadow-[0_6px_20px_-6px_rgba(0,0,0,0.1),0_1px_4px_-1px_rgba(0,0,0,0.04)] [&_.nm-select-viewport]:max-h-[min(56vh,280px)] [&_.nm-select-viewport]:flex [&_.nm-select-viewport]:flex-col [&_.nm-select-viewport]:gap-1.5 [&_.nm-select-viewport]:p-1.5'

/** Menu rows inside hero footer dropdowns. */
export const HERO_FOOTER_SELECT_ITEM_CLASS =
  'w-full min-h-0 gap-1.5 !py-1.5 !px-2 rounded-md [&>span:last-child]:w-full'
