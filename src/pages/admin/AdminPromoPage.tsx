import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Switch } from '@/components/ui/switch'
import { PromoSlider } from '@/components/promo/PromoSlider'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { adminFieldLabelClass, adminInputClass, AdminPageHeader, AdminTableWrap } from '@/components/admin/adminUi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

const PanelFormModal = ({ panel, onSave, onClose }: any) => {
  const isEdit = Boolean(panel?.id)
  const [form, setForm] = useState({
    title: panel?.title ?? '',
    route: panel?.route ?? '',
    position: panel?.position ?? 1,
    is_active: panel?.is_active ?? false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const payload = {
      title: form.title.trim(),
      image_url: null,
      route: form.route.trim() || null,
      position: Number(form.position),
      is_active: form.is_active,
    }
    if (isEdit) {
      await supabase.from('promotional_panels').update(payload).eq('id', panel.id)
    } else {
      await supabase.from('promotional_panels').insert(payload)
    }
    setSaving(false)
    onSave()
  }

  const ROUTE_PRESETS = [
    { label: 'Home', value: '/' },
    { label: 'Explore', value: '/explore' },
    { label: 'Platform', value: '/platform' },
    { label: 'Pricing', value: '/pricing' },
    { label: 'Blog', value: '/blog' },
    { label: 'Room — search', value: '/room?mode=search' },
    { label: 'Room — research', value: '/room?mode=research' },
    { label: 'Room — sourcing', value: '/room?mode=sourcing' },
    { label: 'Room — war room', value: '/room?mode=war-room' },
    { label: 'Room — roadmap', value: '/room?mode=roadmap' },
  ]

  const [opportunities, setOpportunities] = useState<{ slug: string; title: string }[]>([])
  const [loadingOpps, setLoadingOpps] = useState(false)

  useEffect(() => {
    if (!form.route.startsWith('/o/') && !form.route.startsWith('/opportunities') && !form.route.startsWith('/opportunity')) return
    if (opportunities.length > 0) return
    setLoadingOpps(true)
    supabase
      .from('user_opportunities')
      .select('slug, title')
      .eq('visibility', 'catalog')
      .eq('status', 'published')
      .eq('research_status', 'complete')
      .order('title')
      .then(({ data }) => {
        setOpportunities((data ?? []) as any)
        setLoadingOpps(false)
      })
  }, [form.route, opportunities.length])

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Panel' : 'New Panel'}</DialogTitle>
        </DialogHeader>
      <div className="flex flex-col gap-4">
        <div>
          <span className={adminFieldLabelClass}>Internal Label *</span>
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Diwali Offer Banner — Oct 2025" className={adminInputClass} />
          <p className="mt-1 text-[11px] text-muted-foreground">Only visible to admins — not shown to users</p>
        </div>

        <div>
          <span className={adminFieldLabelClass}>Route (where to go on click)</span>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {ROUTE_PRESETS.map((r) => (
              <button
                key={r.value + r.label}
                type="button"
                onClick={() => set('route', r.value)}
                className={cn(
                  'cursor-pointer rounded-md border-[1.5px] px-2.5 py-1 text-[11px] font-semibold transition-colors',
                  form.route === r.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border-default bg-transparent text-muted-foreground hover:border-border-strong',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <input
            value={form.route}
            onChange={(e) => set('route', e.target.value)}
            placeholder="/room?mode=search or https://external.com"
            className={cn(adminInputClass, 'font-sans text-xs')}
          />
          {(form.route.startsWith('/o/') || form.route.startsWith('/opportunities') || form.route.startsWith('/opportunity')) && (
            <div className="mt-2">
              <span className={adminFieldLabelClass}>Specific Opportunity (optional)</span>
              <select
                value={
                  form.route.startsWith('/o/')
                    ? form.route.replace('/o/', '')
                    : form.route.startsWith('/opportunity/')
                      ? form.route.replace('/opportunity/', '')
                      : form.route.startsWith('/opportunities/')
                        ? form.route.replace('/opportunities/', '').split('/')[0] ?? ''
                        : ''
                }
                onChange={(e) => {
                  const slug = e.target.value
                  set('route', slug ? `/o/${slug}` : '/room?mode=search')
                }}
                className={adminInputClass}
                disabled={loadingOpps}
              >
                <option value="">— Opportunities browse (room search) —</option>
                {opportunities.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.title}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Leave blank to link to room search. Pick one to send users to the public preview at `/o/:slug`.
              </p>
            </div>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Use /path for internal pages or full URL for external. Leave blank to make banner non-clickable.
          </p>
        </div>

        <div>
          <span className={adminFieldLabelClass}>Position (order)</span>
          <input type="number" value={form.position} min={1} onChange={(e) => set('position', e.target.value)} className={adminInputClass} />
        </div>

        <label
          className={cn(
            'flex cursor-pointer items-center gap-2.5 rounded-[10px] border-[1.5px] p-3 text-[13px]',
            form.is_active
              ? 'border-primary/30 bg-primary/5'
              : 'border-border-subtle bg-bg-sunken',
          )}
        >
          <Switch checked={form.is_active} onCheckedChange={(v) => set('is_active', v)} />
          <div>
            <div className="font-semibold">{form.is_active ? '🟢 Live' : '⚪ Draft'}</div>
            <div className="text-[11px] text-muted-foreground">
              {form.is_active ? 'Visible to users on the opportunity page' : 'Not visible — set a route before going live'}
            </div>
          </div>
        </label>

        <div className="flex gap-2.5 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="flex-1" disabled={saving || !form.title.trim()} onClick={save}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Panel'}
          </Button>
        </div>
      </div>
      </DialogContent>
    </Dialog>
  )
}

const AdminPromoPage = () => { 
  const [panels, setPanels]   = useState<any[]>([]) 
  const [editing, setEditing] = useState<any>(null) 
  const [showForm, setShowForm] = useState(false)
  const [confirmDeletePanelId, setConfirmDeletePanelId] = useState<string | null>(null)
 
  const load = async () => { 
    // Admin can see all panels including inactive 
    const { data } = await supabase.from('promotional_panels') 
      .select('*').order('position') 
    setPanels(data ?? []) 
  } 
 
  useEffect(() => { load() }, []) 
 
  const toggleActive = async (panel: any) => { 
    await supabase.from('promotional_panels') 
      .update({ is_active: !panel.is_active }).eq('id', panel.id) 
    load() 
  } 
 
  const doDeletePanel = async () => {
    if (!confirmDeletePanelId) return
    const id = confirmDeletePanelId
    setConfirmDeletePanelId(null)
    await supabase.from('promotional_panels').delete().eq('id', id)
    load()
  }
 
  return (
    <div className="mx-auto w-full max-w-platform px-4 py-7 layout-sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="m-0 text-2xl font-extrabold text-foreground">Promotional Panels</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Manage banners and sliders shown across PowerProof</p>
        </div>
        <Button type="button" onClick={() => { setEditing(null); setShowForm(true) }}>
          + New Panel
        </Button>
      </div>

      <AdminTableWrap>
        <Table>
          <TableHeader>
            <TableRow className="bg-bg-sunken hover:bg-bg-sunken">
              <TableHead>Label</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {panels.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-semibold">{p.title}</TableCell>
                <TableCell>#{p.position}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{p.route || '—'}</TableCell>
                <TableCell>{p.is_active ? 'Live' : 'Off'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                    <Button type="button" size="sm" variant="secondary" onClick={() => { setEditing(p); setShowForm(true) }}>
                      Edit
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmDeletePanelId(p.id)}>
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </AdminTableWrap>

      {panels.filter((p) => p.is_active).length > 0 && (
        <div className="mt-8">
          <div className="mb-3 text-[15px] font-bold text-foreground">Live Preview</div>
          <PromoSlider />
        </div>
      )} 
 
      {showForm && (
        <PanelFormModal
          panel={editing}
          onSave={() => { setShowForm(false); load() }}
          onClose={() => setShowForm(false)}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeletePanelId}
        title="Delete panel?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => void doDeletePanel()}
        onCancel={() => setConfirmDeletePanelId(null)}
      />
    </div>
  )
}

export default AdminPromoPage
