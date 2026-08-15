import { createContext, useContext, type ReactNode } from 'react'
import { RunningJobsBanner } from '@/components/RunningJobsBanner'
import { useBackgroundJobs, type BackgroundJobs } from '@/hooks/useBackgroundJobs'

const BackgroundJobsContext = createContext<BackgroundJobs | null>(null)

export function BackgroundJobsProvider({ children }: { children: ReactNode }) {
  const jobs = useBackgroundJobs()

  return (
    <BackgroundJobsContext.Provider value={jobs}>
      <RunningJobsBanner
        activeResearches={jobs.activeResearches}
        activePlaybooks={jobs.activePlaybooks}
        activeRoadmaps={jobs.activeRoadmaps}
        activeSourcingTasks={jobs.activeSourcingTasks}
      />
      {children}
    </BackgroundJobsContext.Provider>
  )
}

export function useBackgroundJobsContext(): BackgroundJobs {
  const ctx = useContext(BackgroundJobsContext)
  if (!ctx) {
    throw new Error('useBackgroundJobsContext must be used within BackgroundJobsProvider')
  }
  return ctx
}

/** Safe outside provider — returns null. */
export function useBackgroundJobsOptional(): BackgroundJobs | null {
  return useContext(BackgroundJobsContext)
}
