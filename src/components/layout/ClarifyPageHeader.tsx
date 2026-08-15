/** @deprecated Use `AppChromeHeader` with `mobileOnly` — kept as a thin alias. */
import { AppChromeHeader } from '@/components/layout/AppChromeHeader'

type ClarifyPageHeaderProps = {
  className?: string
}

export function ClarifyPageHeader({ className }: ClarifyPageHeaderProps) {
  return <AppChromeHeader className={className} mobileOnly />
}
