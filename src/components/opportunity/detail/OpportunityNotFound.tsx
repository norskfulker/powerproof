import { Link } from 'react-router-dom'
import { NotFoundState } from '@/components/NotFoundState'
import { DetailSplit } from '@/components/page-shells'

export function OpportunityNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <DetailSplit>
        <NotFoundState
          className="w-full py-16"
          message="This opportunity may have been removed or is not available."
        >
          <Link
            to="/room?mode=search"
            className="rounded-full bg-primary px-6 py-3 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary-800"
          >
            ← Back to opportunities
          </Link>
        </NotFoundState>
      </DetailSplit>
    </div>
  )
}
