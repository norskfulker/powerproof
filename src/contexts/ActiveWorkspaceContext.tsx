import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ensureDefaultWorkspaceProject } from '@/lib/createWorkspaceProject'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/types/database'

export const ACTIVE_PROJECT_STORAGE_KEY = 'powerproof_active_project_id'

type ActiveWorkspaceValue = {
  projects: Project[]
  activeProject: Project | null
  setActiveProject: (project: Project | null) => void
  isLoading: boolean
  refetchProjects: () => Promise<void>
}

const ActiveWorkspaceContext = createContext<ActiveWorkspaceValue | null>(null)

function readStoredActiveProjectId(): string | null {
  try {
    const id = localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY)
    return id && id.trim() ? id : null
  } catch {
    return null
  }
}

function writeStoredActiveProjectId(projectId: string | null) {
  try {
    if (projectId) {
      localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, projectId)
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function ActiveWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProjectState] = useState<Project | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const setActiveProject = useCallback((project: Project | null) => {
    setActiveProjectState(project)
    writeStoredActiveProjectId(project?.id ?? null)
    if (project) {
      setProjects((prev) => {
        if (prev.some((p) => p.id === project.id)) return prev
        return [project, ...prev]
      })
    }
  }, [])

  const loadProjects = useCallback(async () => {
    if (!user?.id) {
      setProjects([])
      setActiveProjectState(null)
      writeStoredActiveProjectId(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[ActiveWorkspace] projects load error:', error)
      setProjects([])
      setActiveProjectState(null)
      setIsLoading(false)
      return
    }

    let list = (data as Project[]) ?? []

    if (list.length === 0) {
      const { project: ensured, error: ensureError } = await ensureDefaultWorkspaceProject(
        supabase,
        user.id,
      )
      if (ensureError) {
        console.warn('[ActiveWorkspace] default workspace error:', ensureError)
      } else if (ensured) {
        list = [ensured]
      }
    }

    setProjects(list)

    const storedId = readStoredActiveProjectId()
    const fromStorage = storedId ? list.find((p) => p.id === storedId) ?? null : null
    const nextActive = fromStorage ?? list[0] ?? null
    setActiveProjectState(nextActive)
    writeStoredActiveProjectId(nextActive?.id ?? null)
    setIsLoading(false)
  }, [user?.id])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  const value = useMemo<ActiveWorkspaceValue>(
    () => ({
      projects,
      activeProject,
      setActiveProject,
      isLoading,
      refetchProjects: loadProjects,
    }),
    [projects, activeProject, setActiveProject, isLoading, loadProjects],
  )

  return <ActiveWorkspaceContext.Provider value={value}>{children}</ActiveWorkspaceContext.Provider>
}

export function useActiveWorkspace() {
  const ctx = useContext(ActiveWorkspaceContext)
  if (!ctx) {
    throw new Error('useActiveWorkspace must be used within ActiveWorkspaceProvider')
  }
  return ctx
}

/** Resolve active workspace id from explicit override or localStorage. */
export function resolveActiveProjectId(explicitId?: string | null): string | null {
  if (explicitId) return explicitId
  return readStoredActiveProjectId()
}
