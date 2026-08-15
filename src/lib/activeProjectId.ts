import type { Project } from '@/types/database'
import { resolveActiveProjectId } from '@/contexts/ActiveWorkspaceContext'

/** Active workspace id only when it exists in the loaded projects list (avoids stale localStorage ids). */
export function getValidatedActiveProjectId(
  activeProject: Project | null,
  projects: Project[],
): string | null {
  const candidate = resolveActiveProjectId(activeProject?.id ?? null)
  if (!candidate) return null
  return projects.some((p) => p.id === candidate) ? candidate : null
}
