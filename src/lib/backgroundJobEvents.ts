export type BackgroundJobCompleteDetail = {
  kind: 'research' | 'playbook' | 'roadmap' | 'sourcing'
  id: string
  opportunityId?: string
  slug?: string
}

export const BACKGROUND_JOB_COMPLETE_EVENT = 'powerproof:background-job-complete'
export const BACKGROUND_JOBS_REFETCH_EVENT = 'powerproof:background-jobs-refetch'

export function dispatchBackgroundJobsRefetch() {
  window.dispatchEvent(new CustomEvent(BACKGROUND_JOBS_REFETCH_EVENT))
}

export function dispatchBackgroundJobComplete(detail: BackgroundJobCompleteDetail) {
  window.dispatchEvent(new CustomEvent(BACKGROUND_JOB_COMPLETE_EVENT, { detail }))
}
