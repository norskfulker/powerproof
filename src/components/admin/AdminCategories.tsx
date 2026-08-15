import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AdminPageHeader,
  AdminPillButton,
  AdminTableWrap,
  adminInputClass,
  adminFieldLabelClass,
} from '@/components/admin/adminUi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CATEGORY_LUCIDE_ICON_OPTIONS,
  normalizeCategoryIconName,
  renderCategoryIcon,
} from '@/lib/categoryIcons'
import { slugifyCategoryTitle } from '@/lib/slug'
import { getPageIcon } from '@/utils/getPageIcon'
import { cn } from '@/lib/utils'

type CategoryRow = {
  id?: string
  slug: string
  name: string
  lucide: string
  is_active?: boolean
}

type OppMini = { id: string; category_slug: string | null }

function uniqueSlug(base: string, taken: Set<string>): string {
  const first = slugifyCategoryTitle(base)
  if (!taken.has(first)) return first
  let n = 2
  while (taken.has(`${first}-${n}`)) n += 1
  return `${first}-${n}`
}

const AdminCategories = ({ embedded = false }: { embedded?: boolean }) => {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<CategoryRow[]>([])
  const [opps, setOpps] = useState<OppMini[]>([])
  const [editing, setEditing] = useState<CategoryRow | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [catRes, oppRes] = await Promise.all([
      supabase.from('categories').select('id, slug, name, lucide, is_active').order('name', { ascending: true }),
      supabase
        .from('user_opportunities')
        .select('id,category_slug')
        .eq('visibility', 'catalog'),
    ])
    if (catRes.error) toast('Failed to load categories', { description: catRes.error.message })
    if (oppRes.error) toast('Failed to load opportunities', { description: oppRes.error.message })
    setRows((catRes.data as CategoryRow[]) ?? [])
    setOpps((oppRes.data as OppMini[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const oppCountBySlug = useMemo(() => {
    const map: Record<string, number> = {}
    for (const o of opps) {
      const k = o.category_slug ?? ''
      if (!k) continue
      map[k] = (map[k] ?? 0) + 1
    }
    return map
  }, [opps])

  const takenSlugs = useMemo(() => new Set(rows.map((r) => r.slug)), [rows])

  const openNew = () => {
    setEditing({
      name: '',
      slug: '',
      lucide: 'Shapes',
      is_active: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (row: CategoryRow) => {
    setEditing({
      ...row,
      lucide: normalizeCategoryIconName(row.lucide, row.slug),
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditing(null)
  }

  const patchActive = async (row: CategoryRow, isActive: boolean) => {
    if (!row.slug) return
    setTogglingSlug(row.slug)
    const { error } = await supabase.from('categories').update({ is_active: isActive }).eq('slug', row.slug)
    setTogglingSlug(null)
    if (error) {
      toast('Update failed', { description: error.message })
      return
    }
    setRows((prev) => prev.map((r) => (r.slug === row.slug ? { ...r, is_active: isActive } : r)))
  }

  const save = async () => {
    if (!editing) return
    const name = String(editing.name ?? '').trim()
    if (!name) {
      toast('Name is required')
      return
    }

    setSaving(true)
    const isNew = !editing.id
    const slug = isNew ? uniqueSlug(name, takenSlugs) : editing.slug
    const lucide = normalizeCategoryIconName(editing.lucide, slug)

    const payload = {
      ...(editing.id ? { id: editing.id } : {}),
      slug,
      name,
      lucide,
      is_active: editing.is_active ?? true,
    }

    const { error } = await supabase.from('categories').upsert(payload)
    if (error) {
      toast('Save failed', { description: error.message })
      setSaving(false)
      return
    }
    toast('Saved')
    closeDialog()
    await load()
    setSaving(false)
  }

  const selectedLucide = editing
    ? normalizeCategoryIconName(editing.lucide, editing.slug || slugifyCategoryTitle(String(editing.name ?? '')))
    : 'Shapes'

  const previewSlug = editing
    ? editing.id
      ? editing.slug
      : uniqueSlug(String(editing.name ?? ''), takenSlugs)
    : ''

  return (
    <div className="space-y-4">
      {!embedded ? (
        <AdminPageHeader
          title="Categories"
          description={`${rows.length} total · slug auto-generated from name`}
          actions={
            <>
              <AdminPillButton onClick={() => void load()}>Refresh</AdminPillButton>
              <Button type="button" size="sm" onClick={openNew}>
                Add category
              </Button>
            </>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <AdminPillButton onClick={() => void load()}>Refresh</AdminPillButton>
          <Button type="button" size="sm" onClick={openNew}>
            Add category
          </Button>
        </div>
      )}

      <AdminTableWrap>
        <Table>
          <TableHeader>
            <TableRow className="bg-bg-sunken hover:bg-bg-sunken">
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Lucide</TableHead>
              <TableHead>Opps</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No categories.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((c) => (
                <TableRow key={c.slug || c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{c.slug}</TableCell>
                  <TableCell>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-surface text-primary">
                      {renderCategoryIcon(c.slug, c.lucide, 'h-4 w-4')}
                    </span>
                  </TableCell>
                  <TableCell>{oppCountBySlug[c.slug] ?? 0}</TableCell>
                  <TableCell>
                    <Switch
                      checked={Boolean(c.is_active)}
                      disabled={togglingSlug === c.slug}
                      onCheckedChange={(checked) => void patchActive(c, checked)}
                      aria-label={`${c.name} active`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Edit
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </AdminTableWrap>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? closeDialog() : setDialogOpen(true))}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto layout-sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit category' : 'New category'}</DialogTitle>
          </DialogHeader>

          {editing ? (
            <div className="grid gap-4">
              <label className="block">
                <span className={adminFieldLabelClass}>Name</span>
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className={adminInputClass}
                  placeholder="Food & Agri"
                />
                {previewSlug ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Slug: <span className="font-mono text-foreground">{previewSlug}</span>
                    {editing.id ? '' : ''}
                  </p>
                ) : null}
              </label>

              <div>
                <span className={adminFieldLabelClass}>Lucide icon</span>
                <p className="mb-2 text-xs text-muted-foreground">
                  Selected: <span className="font-mono font-semibold text-foreground">{selectedLucide}</span>
                </p>
                <div className="grid max-h-44 grid-cols-6 gap-2 overflow-y-auto rounded-lg border border-border-subtle p-2">
                  {CATEGORY_LUCIDE_ICON_OPTIONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setEditing({ ...editing, lucide: iconName })}
                      className={cn(
                        'flex h-10 items-center justify-center rounded-lg border transition-colors',
                        selectedLucide === iconName
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border-subtle bg-surface hover:border-border-strong',
                      )}
                      title={iconName}
                    >
                      {getPageIcon(iconName, { className: 'h-4 w-4' })}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={adminFieldLabelClass}>Active</span>
                <Switch
                  checked={Boolean(editing.is_active)}
                  onCheckedChange={(checked) => setEditing({ ...editing, is_active: checked })}
                />
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 layout-sm:gap-0">
            <Button type="button" variant="secondary" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminCategories
