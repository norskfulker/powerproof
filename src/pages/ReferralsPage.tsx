import { useMemo } from 'react'

import { Seo } from '@/components/Seo'
import { DashboardGrid } from '@/components/page-shells'
import { ReferralPanel } from '@/components/referrals/ReferralPanel'
import { useRegisterAppChromeHeader } from '@/contexts/AppChromeHeaderContext'
import { Gift } from '@/lib/icons'

export function ReferralsPage() {
  // Stable JSX node — useRegisterAppChromeHeader depends on identity, so a fresh
  // element every render would re-run the effect and cause an update loop.
  const headerIcon = useMemo(() => <Gift className="h-full w-full" aria-hidden />, [])

  useRegisterAppChromeHeader({
    title: 'Referrals',
    icon: headerIcon,
  })

  return (
    <DashboardGrid>
      <Seo
        title="Referrals | PowerProof"
        description="Invite friends to PowerProof and earn credits when they join and purchase."
        canonicalPath="/referrals"
        noIndex
      />

      <div className="mx-auto w-full max-w-3xl px-1 layout-sm:px-0">
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-muted-foreground layout-sm:text-[15px]">
          Share PowerProof with founders you trust. When they join — and when they buy credits — you earn
          PowerProof credits automatically.
        </p>

        <ReferralPanel />
      </div>
    </DashboardGrid>
  )
}

export default ReferralsPage
