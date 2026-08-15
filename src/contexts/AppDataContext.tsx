import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

export type AppDataProjectRow = {
  id: string
  slug: string | null
  name: string | null
  city?: string | null
  category?: string | null
}

type AppData = {
  projects: AppDataProjectRow[]
  projectsLoaded: boolean
  refreshProjects: () => void
}

const AppDataContext = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<AppDataProjectRow[]>([])
  const [projectsLoaded, setProjectsLoaded] = useState(false)
  const projectVersion = useRef(0)

  const fetchProjects = useCallback(() => {
    const v = ++projectVersion.current
    if (!user?.id) {
      setProjects([])
      setProjectsLoaded(true)
      return
    }
    setProjectsLoaded(false)
    void supabase
      .from('projects')
      .select('id, slug, name, city, category')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (projectVersion.current !== v) return
        if (error) {
          console.warn('[AppData] projects load error:', error)
          setProjects([])
        } else {
          setProjects((data as AppDataProjectRow[]) ?? [])
        }
        setProjectsLoaded(true)
      })
  }, [user?.id])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const value = useMemo<AppData>(
    () => ({
      projects,
      projectsLoaded,
      refreshProjects: fetchProjects,
    }),
    [projects, projectsLoaded, fetchProjects],
  )

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext)
  if (!ctx) {
    throw new Error('useAppData must be used within AppDataProvider')
  }
  return ctx
}
