import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { roomPathForMode } from '@/lib/discoverHeroRoutes'

export function MarketTestFailedState() {
  const navigate = useNavigate()

  return (
    <div className="failed-state flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Market test failed
        </h2>
        <p className="text-sm text-muted-foreground">
          Credits have been refunded to your account.
        </p>
        <Button
          type="button"
          variant="primary"
          onClick={() => navigate(roomPathForMode('market-test'))}
        >
          Try again
        </Button>
      </div>
    </div>
  )
}
